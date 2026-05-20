import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Test database connection and fetch problems
    const { data: problems, error } = await supabaseServer
      .from('problems')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ 
        error: error.message, 
        details: 'Database query failed',
        suggestion: 'Check if tables exist and have data'
      }, { status: 500 });
    }

    const { data: testCases } = await supabaseServer
      .from('test_cases')
      .select('count()')
      .single();

    return NextResponse.json({ 
      success: true, 
      problems: problems || [],
      problemCount: problems?.length || 0,
      testCaseCount: testCases?.count || 0,
      message: problems?.length === 0 
        ? 'No problems found. Run seed_complete.sql to populate data.'
        : 'Data loaded successfully'
    });

  } catch (error) {
    console.error('Database test error:', error);
    return NextResponse.json({ 
      error: 'Database connection failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      suggestion: 'Check your .env.local configuration and database connection'
    }, { status: 500 });
  }
}
