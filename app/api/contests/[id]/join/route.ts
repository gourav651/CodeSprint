import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await context.params;

    // 1. Check if contest exists and isn't full
    const { data: contest, error: contestError } = await supabaseServer
      .from('contests')
      .select('status, max_participants')
      .eq('id', id)
      .single();

    if (contestError || !contest) {
      return NextResponse.json({ error: 'Contest not found' }, { status: 404 });
    }

    if (contest.status === 'ended') {
      return NextResponse.json({ error: 'Contest has already ended' }, { status: 400 });
    }

    const { count } = await supabaseServer
      .from('contest_participants')
      .select('id', { count: 'exact', head: true })
      .eq('contest_id', id);

    if (count !== null && contest.max_participants && count >= contest.max_participants) {
      return NextResponse.json({ error: 'Contest is full' }, { status: 400 });
    }

    // 2. Add participant
    const { error: joinError } = await supabaseServer
      .from('contest_participants')
      .insert({ contest_id: id, user_id: userId })
      .select()
      .maybeSingle();

    // If it's a unique constraint violation, they already joined (which is fine)
    if (joinError && joinError.code !== '23505') {
      throw joinError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error joining contest:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
