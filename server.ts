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
const hostname = '0.0.0.0'; 
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
      console.error('Error handling request:', req.url, err);
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

  const ANSWER_BUFFER_TIME = 100;
  let answerBuffer: Array<{
    socket: CustomSocket;
    answer: string;
    username: string;
    timestamp: number;
  }> = [];
  let bufferTimer: NodeJS.Timeout | null = null;

  const broadcastStats = () => {
    io.emit('stats', {
      totalPlayers: io.engine.clientsCount,
      lastWinner: gameState.lastWinner,
    });
  };

  const processAnswers = () => {
    if (answerBuffer.length === 0) return;

    answerBuffer.sort((a, b) => a.timestamp - b.timestamp);

    let winner: typeof answerBuffer[0] | null = null;

    for (const submission of answerBuffer) {
      const result = checkAnswer(submission.answer, submission.username, submission.timestamp);
      if (result.correct && result.isWinner) {
        winner = submission;
        break;
      }
    }

    const winnerData = getCurrentWinner();

    if (winnerData && winner) {
      io.emit('winner', {
        username: winnerData.username,
        answer: winner.answer,
        question: gameState.currentQuestion!.question,
        responseTime: winnerData.responseTime,
      });

      answerBuffer.forEach(({ socket, username }) => {
        if (username !== winnerData.username) {
          const submission = gameState.submissions.find(
            (s) => s.username === username && s.correct
          );
          if (submission) {
            socket.emit('tooLate', { winner: winnerData.username });
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
    if (gameState.currentQuestion) {
      socket.emit('question', gameState.currentQuestion);
    }

    broadcastStats();

    socket.on('restoreSession', async (sessionToken: string) => {
      const session = await restoreUserSession(sessionToken);
      if (session) {
        socket.username = session.username;
        socket.emit('sessionRestored', {
          username: session.username,
          stats: session.stats,
        });
      }
    });

    socket.on('setUsername', async (username: string) => {
      const cleanUsername = username.trim() || `User_${socket.id.slice(0, 6)}`;
      socket.username = cleanUsername;

      const sessionToken = await createUserSession(cleanUsername);
      if (sessionToken) {
        socket.emit('sessionRestored', {
          username: cleanUsername,
          stats: { wins: 0, answered: 0, bestTime: null },
        });

        socket.emit('question', {
          ...gameState.currentQuestion!,
          sessionToken,
        } as any);
      }
    });

    socket.on('submitAnswer', (answer: string) => {
      const timestamp = Date.now();
      const username = socket.username || `User_${socket.id.slice(0, 6)}`;
      const parsed = parseFloat(answer);
      const correct = Math.abs(parsed - gameState.correctAnswer) < 0.01;

      if (!correct) {
        socket.emit('wrongAnswer');
        return;
      }

      answerBuffer.push({ socket, answer, username, timestamp });

      if (!bufferTimer) {
        bufferTimer = setTimeout(processAnswers, ANSWER_BUFFER_TIME);
      }
    });

    socket.on('getLeaderboard', async () => {
      const leaderboard = await getLeaderboard();
      socket.emit('leaderboard', leaderboard);
    });

    socket.on('disconnect', () => {
      answerBuffer = answerBuffer.filter((item) => item.socket.id !== socket.id);
      broadcastStats();
    });
  });

  httpServer.once('error', (err) => {
    console.error(err);
    process.exit(1);
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});