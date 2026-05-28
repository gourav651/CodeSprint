import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { auth } from '@clerk/nextjs/server';

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  emoji: string;
  color: string;
  glowColor: string;
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

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch user_progress joined with problems for difficulty breakdown
    const { data: progress } = await supabaseServer
      .from('user_progress')
      .select('status, problems(difficulty)')
      .eq('user_id', userId);

    // 2. Fetch all submissions for acceptance rate & runtime stats
    const { data: submissions } = await supabaseServer
      .from('submissions')
      .select('status, runtime')
      .eq('user_id', userId);

    const totalSolved = progress?.filter(p => p.status === 'Solved').length ?? 0;

    const easySolved = progress?.filter(
      (p: any) => p.status === 'Solved' && p.problems?.difficulty === 'Easy'
    ).length ?? 0;

    const mediumSolved = progress?.filter(
      (p: any) => p.status === 'Solved' && p.problems?.difficulty === 'Medium'
    ).length ?? 0;

    const hardSolved = progress?.filter(
      (p: any) => p.status === 'Solved' && p.problems?.difficulty === 'Hard'
    ).length ?? 0;

    const totalSubmissions = submissions?.length ?? 0;
    const acceptedSubmissions = submissions?.filter(s => s.status === 'Accepted').length ?? 0;
    const acceptanceRate = totalSubmissions > 0
      ? Math.round((acceptedSubmissions / totalSubmissions) * 100)
      : 0;

    const runtimes = submissions
      ?.filter(s => s.runtime !== null && s.runtime !== undefined)
      .map(s => s.runtime as number) ?? [];
    const minRuntime = runtimes.length > 0 ? Math.min(...runtimes) : null;

    const stats: UserStats = {
      totalSolved,
      easySolved,
      mediumSolved,
      hardSolved,
      totalSubmissions,
      acceptedSubmissions,
      acceptanceRate,
      minRuntime,
    };

    // Compute which badges are unlocked
    const badges = BADGE_DEFINITIONS.map(badge => ({
      id: badge.id,
      name: badge.name,
      description: badge.description,
      emoji: badge.emoji,
      color: badge.color,
      glowColor: badge.glowColor,
      unlocked: badge.check(stats),
      progress: badge.progress(stats),
    }));

    return NextResponse.json({ badges, stats });
  } catch (error) {
    console.error('Error in GET /api/achievements:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
