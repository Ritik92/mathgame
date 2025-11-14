import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server, Socket } from 'socket.io';
import {
  gameState,
  generateNewQuestion,
  checkAnswer,
  getCurrentWinner,
  getLeaderboard,
  createUserSession,
  restoreUserSession,
} from './lib/gameState';
import type { ServerToClientEvents, ClientToServerEvents } from './types/socket';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

interface CustomSocket extends Socket<ClientToServerEvents, ServerToClientEvents> {
  username?: string;
}

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: dev ? 'http://localhost:3000' : '*',
      methods: ['GET', 'POST'],
    },
  });

  const broadcastStats = () => {
    io.emit('stats', {
      totalPlayers: io.engine.clientsCount,
      lastWinner: gameState.lastWinner,
    });
  };

  const ANSWER_BUFFER_TIME = 100;
  let answerBuffer: Array<{
    socket: CustomSocket;
    answer: string;
    username: string;
    timestamp: number;
  }> = [];
  let bufferTimer: NodeJS.Timeout | null = null;

  const processAnswerBuffer = () => {
    if (answerBuffer.length === 0) return;

    console.log(`Processing ${answerBuffer.length} buffered answers...`);
    answerBuffer.sort((a, b) => a.timestamp - b.timestamp);

    let actualWinner: typeof answerBuffer[0] | null = null;

    answerBuffer.forEach(({ socket, answer, username, timestamp }) => {
      const result = checkAnswer(answer, username, timestamp);

      if (result.correct && result.isWinner) {
        actualWinner = { socket, answer, username, timestamp };
      }
    });

    const winner = getCurrentWinner();

    if (winner && actualWinner) {
      io.emit('winner', {
        username: winner.username, //@ts-ignore
        answer: actualWinner.answer,
        question: gameState.currentQuestion!.question,
        responseTime: winner.responseTime,
      });

      answerBuffer.forEach(({ socket, username }) => {
        if (username !== winner.username) {
          const submission = gameState.submissions.find((s) => s.username === username && s.correct);
          if (submission) {
            socket.emit('tooLate', { winner: winner.username });
          }
        }
      });

      setTimeout(() => {
        generateNewQuestion();
        io.emit('question', gameState.currentQuestion!);
      }, 3000);
    }

    answerBuffer = [];
    bufferTimer = null;
  };

  io.on('connection', (socket: CustomSocket) => {
    console.log('User connected:', socket.id);

    if (gameState.currentQuestion) {
      socket.emit('question', gameState.currentQuestion);
    }

    broadcastStats();

    // Handle session restoration
    socket.on('restoreSession', async (sessionToken: string) => {
      const session = await restoreUserSession(sessionToken);
      if (session) {
        socket.username = session.username;
        socket.emit('sessionRestored', {
          username: session.username,
          stats: session.stats,
        });
        console.log(`🔓 ${session.username} reconnected via session token`);
      } else {
        console.log('❌ Invalid session token');
      }
    });

    socket.on('setUsername', async (username: string) => {
      const cleanUsername = username.trim() || `User_${socket.id.slice(0, 6)}`;
      socket.username = cleanUsername;
      
      // Create session token
      const sessionToken = await createUserSession(cleanUsername);
      if (sessionToken) {
        socket.emit('sessionRestored', {
          username: cleanUsername,
          stats: { wins: 0, answered: 0, bestTime: null },
        });
        
        // Send token to client (client will store it)
        socket.emit('question', {
          ...gameState.currentQuestion!,
          sessionToken, // Piggyback on question event
        } as any);
      }
      
      console.log('Username set:', socket.username);
    });

    socket.on('submitAnswer', (answer: string) => {
      const serverTimestamp = Date.now();
      const username = socket.username || `User_${socket.id.slice(0, 6)}`;

      console.log(`🔥 Answer received from ${username} at ${serverTimestamp}`);

      const parsedAnswer = parseFloat(answer);
      const correct = Math.abs(parsedAnswer - gameState.correctAnswer) < 0.01;

      if (!correct) {
        socket.emit('wrongAnswer');
        return;
      }

      answerBuffer.push({
        socket,
        answer,
        username,
        timestamp: serverTimestamp,
      });

      if (!bufferTimer) {
        bufferTimer = setTimeout(processAnswerBuffer, ANSWER_BUFFER_TIME);
      }
    });

    // Handle leaderboard request
    socket.on('getLeaderboard', async () => {
      const leaderboard = await getLeaderboard();
      socket.emit('leaderboard', leaderboard);
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      answerBuffer = answerBuffer.filter((item) => item.socket.id !== socket.id);
      broadcastStats();
    });
  });

  httpServer.once('error', (err) => {
    console.error(err);
    process.exit(1);
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:3000`);
    console.log(`⚡ Network fairness: ${ANSWER_BUFFER_TIME}ms answer buffer`);
    console.log(`📊 Database: Connected to Neon PostgreSQL`);
    console.log(`🔐 Persistent sessions: Enabled`);
  });
});