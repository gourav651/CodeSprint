import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { auth } from '@clerk/nextjs/server';

// Deterministic seeded random — same date always gives same number
function seededRandom(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

function todayDateString(): string {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
}

function dateSeed(dateStr: string): number {
  // Convert YYYYMMDD to a stable integer seed
  return parseInt(dateStr.replace(/-/g, ''), 10);
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    const today = todayDateString();

    // 1. Check if today's challenge is already set
    const { data: existing } = await supabaseServer
      .from('daily_challenges')
      .select('problem_id')
      .eq('challenge_date', today)
      .maybeSingle();

    let problemId: string;

    if (existing?.problem_id) {
      problemId = existing.problem_id;
    } else {
      // 2. Auto-pick: fetch all problem IDs, pick deterministically by date seed
      const { data: allProblems } = await supabaseServer
        .from('problems')
        .select('id')
        .order('created_at', { ascending: true });

      if (!allProblems || allProblems.length === 0) {
        return NextResponse.json({ error: 'No problems available' }, { status: 404 });
      }

      const seed = dateSeed(today);
      const idx = Math.floor(seededRandom(seed) * allProblems.length);
      problemId = allProblems[idx].id;

      // Insert today's challenge
      await supabaseServer
        .from('daily_challenges')
        .upsert({ challenge_date: today, problem_id: problemId }, { onConflict: 'challenge_date' });
    }

    // 3. Fetch full problem details
    const { data: problem } = await supabaseServer
      .from('problems')
      .select('id, title, difficulty, category, description')
      .eq('id', problemId)
      .single();

    if (!problem) {
      return NextResponse.json({ error: 'Problem not found' }, { status: 404 });
    }

    // 4. Count total completions today (Accepted submissions for this problem today)
    const { count: totalCompletions } = await supabaseServer
      .from('submissions')
      .select('id', { count: 'exact', head: true })
      .eq('problem_id', problemId)
      .eq('status', 'Accepted')
      .gte('submitted_at', `${today}T00:00:00.000Z`)
      .lte('submitted_at', `${today}T23:59:59.999Z`);

    // 5. Check if current user completed it today (only if signed in)
    let completedByCurrentUser = false;
    let userCompletionTime: string | null = null;
    let userRuntime: number | null = null;
    let streak = null;

    if (userId) {
      const { data: userSub } = await supabaseServer
        .from('submissions')
        .select('submitted_at, runtime')
        .eq('user_id', userId)
        .eq('problem_id', problemId)
        .eq('status', 'Accepted')
        .gte('submitted_at', `${today}T00:00:00.000Z`)
        .lte('submitted_at', `${today}T23:59:59.999Z`)
        .order('submitted_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (userSub) {
        completedByCurrentUser = true;
        userCompletionTime = userSub.submitted_at;
        userRuntime = userSub.runtime ?? null;
      }

      // Fetch streak
      const { data: streakData } = await supabaseServer
        .from('daily_streaks')
        .select('current_streak, longest_streak, last_completed')
        .eq('user_id', userId)
        .maybeSingle();

      streak = streakData ?? { current_streak: 0, longest_streak: 0, last_completed: null };
    }

    return NextResponse.json({
      problem,
      challengeDate: today,
      totalCompletions: totalCompletions ?? 0,
      completedByCurrentUser,
      userCompletionTime,
      userRuntime,
      streak,
    });
  } catch (error) {
    console.error('Error in GET /api/daily-challenge:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
