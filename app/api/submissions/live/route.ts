import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // 1. Fetch latest 20 submissions globally, joining problems (which has an explicit foreign key relationship)
    const { data: submissions, error: submissionsError } = await supabaseServer
      .from('submissions')
      .select(`
        id,
        user_id,
        problem_id,
        language,
        status,
        runtime,
        memory_usage,
        submitted_at,
        auto_submitted,
        problems (
          title,
          difficulty
        )
      `)
      .order('submitted_at', { ascending: false })
      .limit(20);

    if (submissionsError) {
      console.error('Error fetching live submissions:', submissionsError);
      return NextResponse.json(
        { error: 'Failed to fetch live submissions' },
        { status: 500 }
      );
    }

    if (!submissions || submissions.length === 0) {
      return NextResponse.json({ submissions: [] });
    }

    // 2. Extract unique user IDs from those submissions
    const userIds = Array.from(new Set(submissions.map(sub => sub.user_id)));

    // 3. Fetch user details from the 'users' table for those IDs
    const { data: users, error: usersError } = await supabaseServer
      .from('users')
      .select('id, username, full_name, image_url')
      .in('id', userIds);

    if (usersError) {
      console.error('Error fetching users for submissions:', usersError);
      // We don't crash here; we can still show submissions without user profiles
    }

    // 4. Create a quick lookup map of user_id -> user details
    const userMap: Record<string, { id: string; username: string | null; full_name: string | null; image_url: string | null }> = {};
    if (users) {
      users.forEach(user => {
        userMap[user.id] = user;
      });
    }

    // 5. Enrich submissions with their respective user profile object
    const enrichedSubmissions = submissions.map(sub => ({
      ...sub,
      users: userMap[sub.user_id] || null
    }));

    return NextResponse.json({ submissions: enrichedSubmissions });
  } catch (error) {
    console.error('Error in GET /api/submissions/live:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
