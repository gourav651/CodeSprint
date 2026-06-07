'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Plus, Trash2, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Problem {
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

export default function CreateContestPage() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [duration, setDuration] = useState('60');
  const [maxParticipants, setMaxParticipants] = useState('20');
  
  const [problems, setProblems] = useState<Problem[]>([]);
  const [selectedProblems, setSelectedProblems] = useState<Problem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Set default start time to 1 hour from now
    const now = new Date();
    now.setHours(now.getHours() + 1);
    now.setMinutes(0);
    setStartTime(now.toISOString().slice(0, 16));

    // Fetch available problems
    fetch('/api/problems')
      .then((res) => res.json())
      .then((data) => {
        if (data.problems) setProblems(data.problems);
      });
  }, []);

  if (!isLoaded) return null;
  if (!isSignedIn) {
    router.push('/sign-in');
    return null;
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedProblems.length === 0) {
      setError('Please add at least one problem to the contest.');
      return;
    }
    
    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/contests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          start_time: new Date(startTime).toISOString(),
          duration_minutes: parseInt(duration, 10),
          max_participants: parseInt(maxParticipants, 10),
          problem_ids: selectedProblems.map((p) => p.id),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create contest');
      }

      const { contest } = await res.json();
      router.push(`/contests/${contest.id}`);
    } catch (err: any) {
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  const filteredProblems = problems.filter(
    (p) => 
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) && 
      !selectedProblems.find(sp => sp.id === p.id)
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Create Live Contest</h1>
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleCreate} className="space-y-8">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Basic Info</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contest Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-transparent dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="e.g., Weekly Coding Sprint #1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-transparent dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Optional rules or information..."
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Time</label>
                <input
                  type="datetime-local"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-transparent dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Duration (minutes)</label>
                <input
                  type="number"
                  required
                  min="10"
                  max="300"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-transparent dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max Participants</label>
                <input
                  type="number"
                  required
                  min="2"
                  max="50"
                  value={maxParticipants}
                  onChange={(e) => setMaxParticipants(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-transparent dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex justify-between items-center">
              Selected Problems ({selectedProblems.length})
            </h2>
            
            {/* Selected Problems List */}
            <div className="space-y-2">
              {selectedProblems.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">No problems selected yet.</p>
              )}
              {selectedProblems.map((p, index) => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-gray-500">{index + 1}.</span>
                    <span className="font-medium dark:text-white">{p.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      p.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
                      p.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {p.difficulty}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedProblems(selectedProblems.filter(sp => sp.id !== p.id))}
                    className="text-red-500 hover:text-red-700 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Problem Search */}
            <div className="mt-4 relative">
              <Search className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search problems to add..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-transparent dark:text-white outline-none"
              />
              
              {searchQuery && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredProblems.length === 0 ? (
                    <div className="p-3 text-sm text-gray-500">No problems found</div>
                  ) : (
                    filteredProblems.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSelectedProblems([...selectedProblems, p]);
                          setSearchQuery('');
                        }}
                        className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex justify-between items-center transition"
                      >
                        <span className="text-sm font-medium dark:text-white">{p.title}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            p.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
                            p.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {p.difficulty}
                          </span>
                          <Plus className="w-4 h-4 text-blue-500" />
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="pt-6 border-t border-gray-200 dark:border-gray-700 flex justify-end">
            <Button
              type="submit"
              disabled={isSubmitting || selectedProblems.length === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 rounded-lg font-medium transition disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Contest
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
