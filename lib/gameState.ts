import { generateQuestion } from './questionGenerator';
import { prisma } from './db';
import type { GameState, Question, AnswerSubmission } from '../types/socket';
import crypto from 'crypto';

// In-memory game state
export const gameState: GameState = {
  currentQuestion: null,
  correctAnswer: 0,
  isAnswered: false,
  lastWinner: null,
  questionCount: 0,
  submissions: [],
};

// Generate a new question
export function generateNewQuestion(): Question {
  const { question, answer } = generateQuestion();
  gameState.currentQuestion = {
    id: ++gameState.questionCount,
    question,
    timestamp: Date.now(),
  };
  gameState.correctAnswer = answer;
  gameState.isAnswered = false;
  gameState.submissions = [];

  console.log(`New question #${gameState.questionCount}: ${question} = ${answer}`);
  return gameState.currentQuestion;
}

// Create new user session
export async function createUserSession(username: string): Promise<string | null> {
  try {
    const sessionToken = crypto.randomBytes(32).toString('hex');
    
    await prisma.user.upsert({
      where: { username },
      create: {
        username,
        sessionToken,
        lastActive: new Date(),
      },
      update: {
        sessionToken,
        lastActive: new Date(),
      },
    });

    console.log(`🔐 Session created for ${username}`);
    return sessionToken;
  } catch (error) {
    console.error('Error creating session:', error);
    return null;
  }
}

// Restore user session
export async function restoreUserSession(sessionToken: string): Promise<{ username: string; stats: any } | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { sessionToken },
      select: {
        username: true,
        wins: true,
        answered: true,
        bestTime: true,
      },
    });

    if (!user) {
      return null;
    }

    // Update last active
    await prisma.user.update({
      where: { sessionToken },
      data: { lastActive: new Date() },
    });

    console.log(`🔓 Session restored for ${user.username}`);
    
    return {
      username: user.username,
      stats: {
        wins: user.wins,
        answered: user.answered,
        bestTime: user.bestTime,
      },
    };
  } catch (error) {
    console.error('Error restoring session:', error);
    return null;
  }
}

// Update user stats in database
async function updateUserStats(username: string, won: boolean, responseTime?: number) {
  try {
    const existingUser = await prisma.user.findUnique({
      where: { username },
      select: { bestTime: true },
    });

    const shouldUpdateBestTime =
      won &&
      responseTime &&
      (!existingUser?.bestTime || responseTime < existingUser.bestTime);

    await prisma.user.upsert({
      where: { username },
      create: {
        username,
        wins: won ? 1 : 0,
        answered: 1,
        bestTime: won ? responseTime : null,
        lastActive: new Date(),
      },
      update: {
        wins: won ? { increment: 1 } : undefined,
        answered: { increment: 1 },
        bestTime: shouldUpdateBestTime ? responseTime : undefined,
        lastActive: new Date(),
      },
    });

    console.log(`📊 Stats updated for ${username}: ${won ? 'WIN' : 'answered'}`);
  } catch (error) {
    console.error('Error updating user stats:', error);
  }
}

// Check answer with server-side timestamp for fairness
export function checkAnswer(
  userAnswer: string,
  username: string,
  serverTimestamp: number
): {
  correct: boolean;
  isWinner: boolean;
  winner?: string;
  responseTime?: number;
} {
  const answer = parseFloat(userAnswer);
  const correct = Math.abs(answer - gameState.correctAnswer) < 0.01;

  // Record submission with server timestamp
  const submission: AnswerSubmission = {
    username,
    answer: userAnswer,
    timestamp: serverTimestamp,
    correct,
  };
  gameState.submissions.push(submission);

  if (!correct) {
    return { correct: false, isWinner: false };
  }

  // If already declared a winner, check if this submission was earlier
  if (gameState.isAnswered) {
    const correctSubmissions = gameState.submissions.filter((s) => s.correct);
    const earliestSubmission = correctSubmissions.reduce((earliest, current) =>
      current.timestamp < earliest.timestamp ? current : earliest
    );

    if (earliestSubmission.username === username) {
      gameState.lastWinner = username;
      const responseTime = serverTimestamp - gameState.currentQuestion!.timestamp;

      console.log(`⚡ Timestamp correction: ${username} was actually first (${responseTime}ms)`);

      // Update DB async (non-blocking)
      updateUserStats(username, true, responseTime);

      return {
        correct: true,
        isWinner: true,
        winner: username,
        responseTime,
      };
    }

    // Correct but not winner - still track they answered
    updateUserStats(username, false);

    return {
      correct: true,
      isWinner: false,
      winner: gameState.lastWinner!,
    };
  }

  // First correct answer
  gameState.isAnswered = true;
  gameState.lastWinner = username;

  const responseTime = serverTimestamp - gameState.currentQuestion!.timestamp;

  console.log(`✅ ${username} answered correctly in ${responseTime}ms`);

  // Update DB async (non-blocking)
  updateUserStats(username, true, responseTime);

  return {
    correct: true,
    isWinner: true,
    winner: username,
    responseTime,
  };
}

// Get current winner based on timestamps
export function getCurrentWinner(): { username: string; responseTime: number } | null {
  const correctSubmissions = gameState.submissions.filter((s) => s.correct);

  if (correctSubmissions.length === 0) {
    return null;
  }

  const earliestSubmission = correctSubmissions.reduce((earliest, current) =>
    current.timestamp < earliest.timestamp ? current : earliest
  );

  const responseTime = earliestSubmission.timestamp - gameState.currentQuestion!.timestamp;

  return {
    username: earliestSubmission.username,
    responseTime,
  };
}

// Get leaderboard (top 10 users)
export async function getLeaderboard() {
  try {
    const topUsers = await prisma.user.findMany({
      orderBy: { wins: 'desc' },
      take: 10,
      select: {
        username: true,
        wins: true,
        answered: true,
        bestTime: true,
      },
    });
    return topUsers;
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return [];
  }
}

// Initialize with first question
generateNewQuestion();