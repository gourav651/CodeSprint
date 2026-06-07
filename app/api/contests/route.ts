import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { auth } from '@clerk/nextjs/server';

export async function GET(request: NextRequest) {
  try {
    const { data: contests, error } = await supabaseServer
      .from('contests')
      .select(`
        *,
        contest_participants(count)
      `)
      .order('start_time', { ascending: true });

    if (error) throw error;

    // Transform count from [{count: 5}] to 5
    const formatted = contests.map((c) => ({
      ...c,
      participant_count: c.contest_participants?.[0]?.count ?? 0,
    }));

    // Auto-update status if time has passed
    const now = new Date();
    for (const c of formatted) {
      const start = new Date(c.start_time);
      const end = new Date(c.end_time);
      let newStatus = c.status;
      if (now >= end && c.status !== 'ended') newStatus = 'ended';
      else if (now >= start && now < end && c.status !== 'live') newStatus = 'live';
      
      if (newStatus !== c.status) {
        c.status = newStatus;
        await supabaseServer.from('contests').update({ status: newStatus }).eq('id', c.id);
      }
    }

    return NextResponse.json({ contests: formatted });
  } catch (error) {
    console.error('Error fetching contests:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { title, description, start_time, duration_minutes, max_participants, problem_ids } = body;

    if (!title || !start_time || !duration_minutes || !problem_ids || problem_ids.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const start = new Date(start_time);
    const end = new Date(start.getTime() + duration_minutes * 60000);

    // 1. Create Contest
    const { data: contest, error: contestError } = await supabaseServer
      .from('contests')
      .insert({
        title,
        description,
        host_user_id: userId,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        max_participants: max_participants || 20,
        status: start <= new Date() ? 'live' : 'upcoming',
      })
      .select()
      .single();

    if (contestError) throw contestError;

    // 2. Add Problems
    const contestProblems = problem_ids.map((pid: string, idx: number) => ({
      contest_id: contest.id,
      problem_id: pid,
      position: idx + 1,
    }));

    const { error: probError } = await supabaseServer
      .from('contest_problems')
      .insert(contestProblems);

    if (probError) throw probError;

    // 3. Auto-join Host
    await supabaseServer
      .from('contest_participants')
      .insert({ contest_id: contest.id, user_id: userId });

    return NextResponse.json({ contest });
  } catch (error) {
    console.error('Error creating contest:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
