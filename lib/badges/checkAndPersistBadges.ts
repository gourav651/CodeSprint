// Reusable server-side utility: compute stats → diff against already-persisted
// badges → insert newly unlocked ones → return the list of NEW badge IDs.

import { supabaseServer } from '@/lib/supabase/server';
import { BADGE_DEFINITIONS, UserStats } from '@/lib/badges/definitions';

export interface NewBadge {
  id: string;
  name: string;
  emoji: string;
}

export async function checkAndPersistBadges(userId: string): Promise<NewBadge[]> {
  try {
    // 1. Fetch user progress (to compute solved counts per difficulty)
    const { data: progress } = await supabaseServer
      .from('user_progress')
      .select('status, problems(difficulty)')
      .eq('user_id', userId);

    // 2. Fetch all submissions (for acceptance rate + runtime stats)
    const { data: submissions } = await supabaseServer
      .from('submissions')
      .select('status, runtime')
      .eq('user_id', userId);

    // 3. Build stats object
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

    // 4. Determine which badges the user qualifies for now
    const qualifyingIds = BADGE_DEFINITIONS.filter((b) => b.check(stats)).map((b) => b.id);

    if (qualifyingIds.length === 0) return [];

    // 5. Fetch already-persisted badges so we don't double-insert
    const { data: existing } = await supabaseServer
      .from('user_badges')
      .select('badge_id')
      .eq('user_id', userId);

    const existingIds = new Set((existing ?? []).map((r: any) => r.badge_id));

    // 6. Find badges that are newly unlocked (qualify now but not yet persisted)
    const newlyUnlocked = qualifyingIds.filter((id) => !existingIds.has(id));

    if (newlyUnlocked.length === 0) return [];

    // 7. Insert newly unlocked badges
    await supabaseServer.from('user_badges').insert(
      newlyUnlocked.map((badge_id) => ({ user_id: userId, badge_id }))
    );

    // 8. Return full badge objects for the newly unlocked ones (for toast display)
    return newlyUnlocked.map((id) => {
      const def = BADGE_DEFINITIONS.find((b) => b.id === id)!;
      return { id: def.id, name: def.name, emoji: def.emoji };
    });
  } catch (err) {
    // Never crash the submission flow because of badge errors
    console.error('[checkAndPersistBadges] Error:', err);
    return [];
  }
}
