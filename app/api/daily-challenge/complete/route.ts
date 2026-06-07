import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { auth } from '@clerk/nextjs/server';

function todayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

function yesterdayDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

// Called after a user gets Accepted on today's daily challenge problem
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const today = todayDateString();
    const yesterday = yesterdayDateString();

    // Fetch existing streak row
    const { data: existing } = await supabaseServer
      .from('daily_streaks')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    let newCurrent = 1;
    let newLongest = 1;

    if (existing) {
      // Already completed today — no change needed
      if (existing.last_completed === today) {
        return NextResponse.json({
          current_streak: existing.current_streak,
          longest_streak: existing.longest_streak,
          already_counted: true,
        });
      }

      // Solved yesterday → extend streak, else restart
      newCurrent = existing.last_completed === yesterday
        ? existing.current_streak + 1
        : 1;
      newLongest = Math.max(existing.longest_streak, newCurrent);
    }

    await supabaseServer
      .from('daily_streaks')
      .upsert({
        user_id: userId,
        current_streak: newCurrent,
        longest_streak: newLongest,
        last_completed: today,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    return NextResponse.json({
      current_streak: newCurrent,
      longest_streak: newLongest,
      already_counted: false,
    });
  } catch (error) {
    console.error('Error in POST /api/daily-challenge/complete:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
