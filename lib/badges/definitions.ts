// Shared badge definitions — imported by both the achievements API and
// the badge-check utility so there's a single source of truth.

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  emoji: string;
  color: string;         // Tailwind gradient classes e.g. "from-red-500 to-rose-600"
  glowColor: string;     // Tailwind shadow class
  check: (stats: UserStats) => boolean;
  progress: (stats: UserStats) => { current: number; target: number };
}

export interface UserStats {
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  totalSubmissions: number;
  acceptedSubmissions: number;
  acceptanceRate: number;
  minRuntime: number | null;
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: 'first_blood',
    name: 'First Blood',
    description: 'Solved your very first problem',
    emoji: '🩸',
    color: 'from-red-500 to-rose-600',
    glowColor: 'shadow-red-500/40',
    check: (s) => s.totalSolved >= 1,
    progress: (s) => ({ current: Math.min(s.totalSolved, 1), target: 1 }),
  },
  {
    id: 'warm_up',
    name: 'Warm Up',
    description: 'Solved 5 or more problems',
    emoji: '🔥',
    color: 'from-orange-500 to-amber-500',
    glowColor: 'shadow-orange-500/40',
    check: (s) => s.totalSolved >= 5,
    progress: (s) => ({ current: Math.min(s.totalSolved, 5), target: 5 }),
  },
  {
    id: 'on_a_roll',
    name: 'On A Roll',
    description: 'Solved 10 or more problems',
    emoji: '🚀',
    color: 'from-blue-500 to-indigo-600',
    glowColor: 'shadow-blue-500/40',
    check: (s) => s.totalSolved >= 10,
    progress: (s) => ({ current: Math.min(s.totalSolved, 10), target: 10 }),
  },
  {
    id: 'easy_champion',
    name: 'Easy Champion',
    description: 'Solved 10 Easy problems',
    emoji: '🟢',
    color: 'from-green-500 to-emerald-600',
    glowColor: 'shadow-green-500/40',
    check: (s) => s.easySolved >= 10,
    progress: (s) => ({ current: Math.min(s.easySolved, 10), target: 10 }),
  },
  {
    id: 'medium_mastery',
    name: 'Medium Mastery',
    description: 'Solved 5 Medium problems',
    emoji: '🟡',
    color: 'from-yellow-400 to-orange-500',
    glowColor: 'shadow-yellow-400/40',
    check: (s) => s.mediumSolved >= 5,
    progress: (s) => ({ current: Math.min(s.mediumSolved, 5), target: 5 }),
  },
  {
    id: 'hard_mode',
    name: 'Hard Mode',
    description: 'Conquered 3 Hard problems',
    emoji: '🔴',
    color: 'from-red-600 to-pink-700',
    glowColor: 'shadow-red-600/40',
    check: (s) => s.hardSolved >= 3,
    progress: (s) => ({ current: Math.min(s.hardSolved, 3), target: 3 }),
  },
  {
    id: 'sharpshooter',
    name: 'Sharpshooter',
    description: 'Maintained an acceptance rate ≥ 80%',
    emoji: '🎯',
    color: 'from-purple-500 to-violet-600',
    glowColor: 'shadow-purple-500/40',
    check: (s) => s.totalSubmissions >= 5 && s.acceptanceRate >= 80,
    progress: (s) => ({ current: Math.min(Math.round(s.acceptanceRate), 80), target: 80 }),
  },
  {
    id: 'persistent',
    name: 'Persistent Coder',
    description: 'Made 20 or more total submissions',
    emoji: '💪',
    color: 'from-cyan-500 to-teal-600',
    glowColor: 'shadow-cyan-500/40',
    check: (s) => s.totalSubmissions >= 20,
    progress: (s) => ({ current: Math.min(s.totalSubmissions, 20), target: 20 }),
  },
  {
    id: 'speedy',
    name: 'Speedy Gonzales',
    description: 'Submitted code with runtime under 1ms',
    emoji: '⚡',
    color: 'from-yellow-300 to-yellow-500',
    glowColor: 'shadow-yellow-300/40',
    check: (s) => s.minRuntime !== null && s.minRuntime < 1,
    progress: (s) => ({ current: s.minRuntime !== null && s.minRuntime < 1 ? 1 : 0, target: 1 }),
  },
];
