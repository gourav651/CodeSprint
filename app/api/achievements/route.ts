import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { auth } from '@clerk/nextjs/server';
import { BADGE_DEFINITIONS, UserStats } from '@/lib/badges/definitions';

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

    // 3. Build stats
    const totalSolved = progress?.filter((p) => p.status === 'Solved').length ?? 0;
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
    const acceptedSubmissions = submissions?.filter((s) => s.status === 'Accepted').length ?? 0;
    const acceptanceRate =
      totalSubmissions > 0 ? Math.round((acceptedSubmissions / totalSubmissions) * 100) : 0;
    const runtimes = submissions
      ?.filter((s) => s.runtime !== null && s.runtime !== undefined)
      .map((s) => s.runtime as number) ?? [];
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

    // 4. Fetch persisted user_badges to get unlocked_at timestamps
    const { data: userBadges } = await supabaseServer
      .from('user_badges')
      .select('badge_id, unlocked_at')
      .eq('user_id', userId);

    const badgeTimestampMap: Record<string, string> = {};
    (userBadges ?? []).forEach((row: any) => {
      badgeTimestampMap[row.badge_id] = row.unlocked_at;
    });

    // 5. Build response — merge definitions + stats + persisted unlock dates
    const badges = BADGE_DEFINITIONS.map((badge) => {
      const unlocked = badge.check(stats);
      return {
        id: badge.id,
        name: badge.name,
        description: badge.description,
        emoji: badge.emoji,
        color: badge.color,
        glowColor: badge.glowColor,
        unlocked,
        // unlockedAt is only set when the badge is actually in user_badges table
        unlockedAt: badgeTimestampMap[badge.id] ?? null,
        progress: badge.progress(stats),
      };
    });

    return NextResponse.json({ badges, stats });
  } catch (error) {
    console.error('Error in GET /api/achievements:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
