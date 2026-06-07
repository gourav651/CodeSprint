import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

function todayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

export async function GET(request: NextRequest) {
  try {
    const today = todayDateString();

    // Get today's challenge problem_id
    const { data: challenge } = await supabaseServer
      .from('daily_challenges')
      .select('problem_id')
      .eq('challenge_date', today)
      .maybeSingle();

    if (!challenge?.problem_id) {
      return NextResponse.json({ leaderboard: [] });
    }

    // Get all Accepted submissions for today's problem made today, earliest first
    const { data: submissions } = await supabaseServer
      .from('submissions')
      .select('user_id, submitted_at, runtime')
      .eq('problem_id', challenge.problem_id)
      .eq('status', 'Accepted')
      .gte('submitted_at', `${today}T00:00:00.000Z`)
      .lte('submitted_at', `${today}T23:59:59.999Z`)
      .order('submitted_at', { ascending: true });

    if (!submissions || submissions.length === 0) {
      return NextResponse.json({ leaderboard: [] });
    }

    // Keep only first (earliest) solve per user
    const seen = new Set<string>();
    const unique = submissions.filter((s) => {
      if (seen.has(s.user_id)) return false;
      seen.add(s.user_id);
      return true;
    });

    // Fetch user details
    const userIds = unique.map((s) => s.user_id);
    const { data: users } = await supabaseServer
      .from('users')
      .select('id, username, full_name, image_url')
      .in('id', userIds);

    const userMap: Record<string, any> = {};
    (users ?? []).forEach((u) => { userMap[u.id] = u; });

    const leaderboard = unique.map((s, idx) => ({
      rank: idx + 1,
      user_id: s.user_id,
      username: userMap[s.user_id]?.username ?? null,
      full_name: userMap[s.user_id]?.full_name ?? null,
      image_url: userMap[s.user_id]?.image_url ?? null,
      submitted_at: s.submitted_at,
      runtime: s.runtime ?? null,
    }));

    return NextResponse.json({ leaderboard });
  } catch (error) {
    console.error('Error in GET /api/daily-challenge/leaderboard:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
