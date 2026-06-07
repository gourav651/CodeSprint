import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { auth } from '@clerk/nextjs/server';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth();
    const { id } = await context.params;

    // 1. Get contest
    const { data: contest, error: contestError } = await supabaseServer
      .from('contests')
      .select('*')
      .eq('id', id)
      .single();

    if (contestError || !contest) {
      return NextResponse.json({ error: 'Contest not found' }, { status: 404 });
    }

    // 2. Get problems
    const { data: problems } = await supabaseServer
      .from('contest_problems')
      .select(`
        position,
        problems (*)
      `)
      .eq('contest_id', id)
      .order('position', { ascending: true });

    // 3. Get participants count and list (limit to 50 for lobby)
    const { data: participants } = await supabaseServer
      .from('contest_participants')
      .select('user_id')
      .eq('contest_id', id)
      .limit(50);

    const isParticipant = participants?.some((p) => p.user_id === userId) ?? false;
    const participantCount = participants?.length ?? 0;

    // Get basic user details for participants (for avatar display)
    let usersList: any[] = [];
    if (participants && participants.length > 0) {
       const userIds = participants.map((p) => p.user_id);
       const { data: usersData } = await supabaseServer
         .from('users')
         .select('id, username, full_name, image_url')
         .in('id', userIds);
       usersList = usersData ?? [];
    }

    return NextResponse.json({
      contest,
      problems: problems?.map((p: any) => ({ position: p.position, ...p.problems })) || [],
      isParticipant,
      participantCount,
      participants: usersList,
    });
  } catch (error) {
    console.error('Error fetching contest details:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
