export interface ServerToClientEvents {
  question: (question: Question) => void;
  winner: (data: WinnerData) => void;
  wrongAnswer: () => void;
  tooLate: (data: { winner: string }) => void;
  stats: (data: Stats) => void;
  leaderboard: (data: LeaderboardEntry[]) => void;
  sessionRestored: (data: { username: string; stats: UserStats }) => void;
}

export interface ClientToServerEvents {
  setUsername: (username: string) => void;
  submitAnswer: (answer: string) => void;
  getLeaderboard: () => void;
  restoreSession: (sessionToken: string) => void;
}

export interface Question {
  id: number;
  question: string;
  timestamp: number;
}

export interface WinnerData {
  username: string;
  answer: string;
  question: string;
  responseTime?: number;
}

export interface Stats {
  totalPlayers: number;
  lastWinner: string | null;
}

export interface GameState {
  currentQuestion: Question | null;
  correctAnswer: number;
  isAnswered: boolean;
  lastWinner: string | null;
  questionCount: number;
  submissions: AnswerSubmission[];
}

export interface AnswerSubmission {
  username: string;
  answer: string;
  timestamp: number;
  correct: boolean;
}

export interface LeaderboardEntry {
  username: string;
  wins: number;
  answered: number;
  bestTime: number | null;
}

export interface UserStats {
  wins: number;
  answered: number;
  bestTime: number | null;
}