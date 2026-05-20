import { supabaseServer } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { ProblemSolver } from '@/components/problem-solver/ProblemSolver';
import { auth } from '@clerk/nextjs/server';

interface ProblemPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProblemPage({ params }: ProblemPageProps) {
  const { userId } = await auth();
  const { id } = await params;
  
  const { data: problem } = await supabaseServer
    .from('problems')
    .select('*')
    .eq('id', id)
    .single();

  if (!problem) {
    notFound();
  }

  // Fetch test cases for this problem
  const { data: test_cases } = await supabaseServer
    .from('test_cases')
    .select('input, expected_output, is_hidden')
    .eq('problem_id', id);

  let userSubmissions = [];
  if (userId) {
    const { data: submissions } = await supabaseServer
      .from('submissions')
      .select('*')
      .eq('user_id', userId)
      .eq('problem_id', id)
      .order('submitted_at', { ascending: false })
      .limit(10);
    
    userSubmissions = submissions || [];
  }

  return (
    <div className="h-screen flex flex-col">
      <ProblemSolver 
        problem={{ ...problem, test_cases }}
        userSubmissions={userSubmissions}
        user={{ id: userId }}
      />
    </div>
  );
}