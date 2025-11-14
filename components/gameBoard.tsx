'use client';

import { useState, useRef, useEffect } from 'react';
import { useSocket, storeSessionToken } from '@/hooks/useSocket';
import type { Question, WinnerData, Stats, LeaderboardEntry, UserStats } from '@/types/socket';
import { 
  CheckCircle, 
  XCircle, 
  Trophy, 
  Users, 
  Zap, 
  Clock, 
  Loader2, 
  Crown, 
  Medal, 
  Award,
  X
} from 'lucide-react';

/**
 * Toast Notification Component
 * Shows temporary success/error/info messages
 */
interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

const Toast = ({ message, type, onClose }: ToastProps) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const styles = {
    success: 'bg-emerald-500',
    error: 'bg-rose-500',
    info: 'bg-blue-500'
  };

  const icons = {
    success: <CheckCircle className="w-5 h-5" />,
    error: <XCircle className="w-5 h-5" />,
    info: <Zap className="w-5 h-5" />
  };

  return (
    <div className={`fixed top-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-auto ${styles[type]} text-white px-4 sm:px-6 py-3 rounded-lg shadow-xl flex items-center gap-2 sm:gap-3 animate-slide-in z-50 max-w-[calc(100vw-2rem)] sm:max-w-md`}>
      {icons[type]}
      <span className="font-medium text-sm sm:text-base flex-1 min-w-0 truncate">{message}</span>
      <button onClick={onClose} className="ml-2 hover:bg-white/20 rounded p-1 flex-shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

/**
 * Loading Screen Component
 * Shown while connecting/restoring session
 */
const Loader = ({ text }: { text: string }) => (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 flex flex-col items-center gap-4 w-full max-w-sm">
      <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 text-indigo-600 animate-spin" />
      <p className="text-slate-600 font-medium text-sm sm:text-base text-center">{text}</p>
    </div>
  </div>
);

/**
 * Leaderboard Panel Component
 * Displays top players with their stats
 */
interface LeaderboardPanelProps {
  leaderboard: LeaderboardEntry[];
  currentUsername: string;
  onClose: () => void;
}

const LeaderboardPanel = ({ leaderboard, currentUsername, onClose }: LeaderboardPanelProps) => {
  const getMedalIcon = (index: number) => {
    if (index === 0) return <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />;
    if (index === 1) return <Medal className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />;
    if (index === 2) return <Award className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />;
    return <span className="text-slate-500 font-semibold text-xs sm:text-sm">#{index + 1}</span>;
  };

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 p-4 sm:p-6 mb-4 sm:mb-6 shadow-sm">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
          <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
          Leaderboard
        </h3>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 transition-colors text-xs sm:text-sm font-medium"
        >
          Hide
        </button>
      </div>

      {leaderboard.length === 0 ? (
        <div className="text-center py-6 sm:py-8">
          <Trophy className="w-10 h-10 sm:w-12 sm:h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-xs sm:text-sm">No winners yet. Be the first!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {leaderboard.map((player, index) => (
            <div
              key={player.username}
              className={`flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg sm:rounded-xl transition-all ${
                player.username === currentUsername
                  ? 'bg-indigo-50 border-2 border-indigo-200'
                  : 'bg-slate-50 hover:bg-slate-100'
              }`}
            >
              <div className="w-6 sm:w-8 flex items-center justify-center flex-shrink-0">
                {getMedalIcon(index)}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-semibold truncate text-sm sm:text-base ${
                  player.username === currentUsername ? 'text-indigo-700' : 'text-slate-900'
                }`}>
                  {player.username}
                  {player.username === currentUsername && (
                    <span className="ml-1 sm:ml-2 text-xs text-indigo-600">(You)</span>
                  )}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-3 text-xs sm:text-sm flex-shrink-0">
                <span className="font-bold text-slate-900 whitespace-nowrap">{player.wins} wins</span>
                {player.bestTime && (
                  <span className="text-amber-600 font-medium flex items-center gap-1 whitespace-nowrap">
                    <Zap className="w-3 h-3" />
                    {player.bestTime}ms
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Winner Banner Component
 * Displays winner announcement with animation
 */
interface WinnerBannerProps {
  winner: WinnerData;
  isCurrentUser: boolean;
}

const WinnerBanner = ({ winner, isCurrentUser }: WinnerBannerProps) => {
  return (
    <div className={`rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6 text-center shadow-lg animate-bounce-in ${
      isCurrentUser
        ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'
        : 'bg-gradient-to-br from-emerald-400 to-teal-500 text-white'
    }`}>
      {isCurrentUser ? (
        <>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Trophy className="w-6 h-6 sm:w-8 sm:h-8" />
            <h3 className="text-xl sm:text-2xl md:text-3xl font-bold">You Won!</h3>
            <Trophy className="w-6 h-6 sm:w-8 sm:h-8" />
          </div>
          <p className="text-white/90 mb-3 text-sm sm:text-base">Congratulations! You solved it first!</p>
        </>
      ) : (
        <>
          <h3 className="text-lg sm:text-xl md:text-2xl font-bold mb-2">
            {winner.username} won this round!
          </h3>
        </>
      )}
      
      <div className="bg-white/20 backdrop-blur-sm rounded-lg sm:rounded-xl p-3 sm:p-4 mb-3">
        <p className="text-xl sm:text-2xl font-bold break-words">
          {winner.question} = {winner.answer}
        </p>
      </div>
      
      {winner.responseTime && (
        <div className="flex items-center justify-center gap-2 text-xs sm:text-sm font-medium text-white/90">
          <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
          Response time: {winner.responseTime}ms
        </div>
      )}
      
      <p className="text-xs sm:text-sm text-white/80 mt-3 sm:mt-4">Next question in 3 seconds...</p>
    </div>
  );
};

/**
 * Main GameBoard Component
 * Handles all game logic and UI states
 */
export default function GameBoard() {
  const socket = useSocket();
  
  // State management
  const [username, setUsername] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [question, setQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState('');
  const [winner, setWinner] = useState<WinnerData | null>(null);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [isWinner, setIsWinner] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * Show toast notification helper
   */
  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
  };

  /**
   * Socket event handlers
   */
  useEffect(() => {
    if (!socket) return;

    // Connection established
    socket.on('connect', () => {
      console.log('✅ Connected to server');
    });

    // Session restored successfully
    socket.on('sessionRestored', (data: { username: string; stats: UserStats }) => {
      setUsername(data.username);
      setUserStats(data.stats);
      setIsJoined(true);
      setIsRestoringSession(false);
      showToast('Welcome back, ' + data.username + '!', 'success');
      console.log('🔓 Session restored:', data.username);
    });

    // New question received
    socket.on('question', (newQuestion: Question | any) => {
      // Store session token if provided (on first join)
      if ((newQuestion as any).sessionToken) {
        storeSessionToken((newQuestion as any).sessionToken);
        console.log('🔐 Session token stored');
      }

      setQuestion(newQuestion);
      setAnswer('');
      setWinner(null);
      setIsWinner(false);
      setIsRestoringSession(false);
      
      // Focus input after question appears
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    });

    // Winner announced
    socket.on('winner', (data: WinnerData) => {
      setWinner(data);
      const didIWin = data.username === username;
      setIsWinner(didIWin);

      if (didIWin) {
        showToast('🎉 You won! +1 point', 'success');
        
        // Update local stats
        if (userStats) {
          setUserStats({
            wins: userStats.wins + 1,
            answered: userStats.answered + 1,
            bestTime:
              data.responseTime &&
              (!userStats.bestTime || data.responseTime < userStats.bestTime)
                ? data.responseTime
                : userStats.bestTime,
          });
        }
      }
    });

    // Wrong answer submitted
    socket.on('wrongAnswer', () => {
      showToast('Wrong answer, try again!', 'error');
      setAnswer('');
    });

    // Answer was correct but too late
    socket.on('tooLate', (data: { winner: string }) => {
      showToast(`Too late! ${data.winner} already won`, 'info');
    });

    // Player stats updated
    socket.on('stats', (data: Stats) => {
      setTotalPlayers(data.totalPlayers);
    });

    // Leaderboard data received
    socket.on('leaderboard', (data: LeaderboardEntry[]) => {
      setLeaderboard(data);
    });

    // Check if session restoration failed after timeout
    const timer = setTimeout(() => {
      if (isRestoringSession) {
        setIsRestoringSession(false);
      }
    }, 2000);

    // Cleanup
    return () => {
      clearTimeout(timer);
      socket.off('connect');
      socket.off('sessionRestored');
      socket.off('question');
      socket.off('winner');
      socket.off('wrongAnswer');
      socket.off('tooLate');
      socket.off('stats');
      socket.off('leaderboard');
    };
  }, [socket, username, userStats, isRestoringSession]);

  /**
   * Handle user joining the game
   */
  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (usernameInput.trim() && socket) {
      setIsJoining(true);
      socket.emit('setUsername', usernameInput.trim());
      // Wait for sessionRestored event to complete join
    }
  };

  /**
   * Handle answer submission
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (answer.trim() && !winner && socket) {
      socket.emit('submitAnswer', answer.trim());
    }
  };

  /**
   * Toggle leaderboard visibility
   */
  const toggleLeaderboard = () => {
    if (!showLeaderboard && socket) {
      socket.emit('getLeaderboard');
    }
    setShowLeaderboard(!showLeaderboard);
  };

  // Show loading screen while restoring session
  if (!socket || isRestoringSession) {
    return (
      <Loader text={isRestoringSession ? '🔐 Restoring your session...' : 'Connecting to server...'} />
    );
  }

  // Show join screen if not joined yet
  if (!isJoined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl p-6 sm:p-8 md:p-10">
            {/* Header */}
            <div className="text-center mb-6 sm:mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-indigo-100 rounded-xl sm:rounded-2xl mb-3 sm:mb-4">
                <Zap className="w-7 h-7 sm:w-8 sm:h-8 text-indigo-600" />
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-2">
                Math Quiz Arena
              </h1>
              <p className="text-sm sm:text-base text-slate-600">
                Compete in real-time. Be the fastest solver.
              </p>
            </div>

            {/* Join Form */}
            <div className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-xs sm:text-sm font-medium text-slate-700 mb-2">
                  Choose your username
                </label>
                <input
                  id="username"
                  type="text"
                  placeholder="Enter username"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleJoin(e as any);
                    }
                  }}
                  maxLength={20}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-base sm:text-lg text-slate-900 placeholder:text-slate-400"
                  autoFocus
                  disabled={isJoining}
                />
              </div>

              <button
                onClick={handleJoin}
                disabled={!usernameInput.trim() || isJoining}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 disabled:shadow-none text-sm sm:text-base"
              >
                {isJoining ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Joining...
                  </>
                ) : (
                  <>
                    Start Playing
                    <Zap className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>

            {/* Info */}
            <div className="mt-5 sm:mt-6 pt-5 sm:pt-6 border-t border-slate-100">
              <p className="text-xs text-slate-500 text-center">
                Answer math problems faster than others to win points
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main game interface
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50">
      {/* Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Main Container */}
      <div className="max-w-4xl mx-auto p-3 sm:p-4 md:p-6 lg:p-8">
        {/* Header Card */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col gap-3 sm:gap-4">
            {/* Title */}
            <div className="flex items-center justify-between">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
                <Zap className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-indigo-600" />
                <span className="hidden xs:inline">Math Quiz Arena</span>
                <span className="xs:hidden">Math Quiz</span>
              </h1>
              
              {/* Leaderboard Button - Mobile top right */}
              <button
                onClick={toggleLeaderboard}
                className="sm:hidden bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-3 py-1.5 rounded-lg font-semibold transition-all shadow-sm hover:shadow-md flex items-center gap-1.5 text-xs"
              >
                <Trophy className="w-3.5 h-3.5" />
                {showLeaderboard ? 'Hide' : 'Board'}
              </button>
            </div>

            {/* Stats Bar */}
            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
              {/* Username Badge */}
              <div className="bg-indigo-50 text-indigo-700 px-2.5 sm:px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5">
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                <span className="truncate max-w-[120px] sm:max-w-none">{username}</span>
              </div>

              {/* User Stats Badge */}
              {userStats && (
                <div className="bg-amber-50 text-amber-700 px-2.5 sm:px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>{userStats.wins}</span>
                  {userStats.bestTime && (
                    <span className="hidden xs:inline text-xs">• ⚡{userStats.bestTime}ms</span>
                  )}
                </div>
              )}

              {/* Online Players Badge */}
              <div className="bg-slate-100 text-slate-700 px-2.5 sm:px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                {totalPlayers || 1}
              </div>

              {/* Leaderboard Button - Desktop */}
              <button
                onClick={toggleLeaderboard}
                className="hidden sm:flex bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-4 py-1.5 rounded-lg font-semibold transition-all shadow-sm hover:shadow-md items-center gap-1.5"
              >
                <Trophy className="w-4 h-4" />
                {showLeaderboard ? 'Hide' : 'Leaderboard'}
              </button>
            </div>
          </div>
        </div>

        {/* Leaderboard Panel */}
        {showLeaderboard && (
          <LeaderboardPanel
            leaderboard={leaderboard}
            currentUsername={username}
            onClose={() => setShowLeaderboard(false)}
          />
        )}

        {/* Winner Banner */}
        {winner && (
          <WinnerBanner winner={winner} isCurrentUser={isWinner} />
        )}

        {/* Question Card */}
        {question && (
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 md:p-8 mb-4 sm:mb-6">
            <div className="text-center">
              <p className="text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 sm:mb-4">
                Question #{question.id}
              </p>
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 mb-4 sm:mb-6 md:mb-8 break-words">
                {question.question} = ?
              </h2>

              {/* Answer Input Form */}
              <div className="max-w-md mx-auto">
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <input
                    ref={inputRef}
                    type="number"
                    step="any"
                    placeholder="Your answer"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSubmit(e as any);
                      }
                    }}
                    disabled={!!winner}
                    className="flex-1 px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-base sm:text-lg font-semibold text-slate-900 placeholder:text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"
                    autoFocus
                  />
                  <button
                    onClick={handleSubmit}
                    disabled={!answer.trim() || !!winner}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold px-6 py-3 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 disabled:shadow-none flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    <Zap className="w-4 h-4 sm:w-5 sm:h-5" />
                    Submit
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tips Card */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl sm:rounded-2xl border border-indigo-100 p-4 sm:p-6">
          <h3 className="font-bold text-slate-900 mb-2 sm:mb-3 flex items-center gap-2 text-sm sm:text-base">
            <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
            Pro Tips
          </h3>
          <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-slate-700">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
              <span>Be fast! The first correct answer wins</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
              <span>Your session is saved - you can refresh anytime</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
              <span>Compete against players worldwide in real-time</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes bounce-in {
          0% {
            transform: scale(0.9);
            opacity: 0;
          }
          50% {
            transform: scale(1.05);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
        
        .animate-bounce-in {
          animation: bounce-in 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}