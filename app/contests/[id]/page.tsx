'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import { Clock, Users, Calendar, ArrowRight, Loader2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ContestLobbyPage() {
  const params = useParams();
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  
  const [contest, setContest] = useState<any>(null);
  const [problems, setProblems] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [isParticipant, setIsParticipant] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);
  
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  
  const [timeToStart, setTimeToStart] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/contests/${params.id}`)
      .then(res => {
        if (!res.ok) throw new Error('Contest not found');
        return res.json();
      })
      .then(data => {
        setContest(data.contest);
        setProblems(data.problems);
        setParticipants(data.participants);
        setIsParticipant(data.isParticipant);
        setParticipantCount(data.participantCount);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [params.id]);

  useEffect(() => {
    if (!contest) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const start = new Date(contest.start_time).getTime();
      const diff = start - now;

      if (diff <= 0) {
        setTimeToStart('Started');
        if (contest.status === 'upcoming') {
          setContest({ ...contest, status: 'live' });
        }
      } else {
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeToStart(`${h}h ${m}m ${s}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [contest]);

  const handleJoin = async () => {
    if (!isSignedIn) {
      router.push('/sign-in');
      return;
    }

    setJoining(true);
    setError('');

    try {
      const res = await fetch(`/api/contests/${params.id}/join`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setIsParticipant(true);
      setParticipantCount(prev => prev + 1);
      // Re-fetch to get updated participants list
      const detailsRes = await fetch(`/api/contests/${params.id}`);
      const detailsData = await detailsRes.json();
      setParticipants(detailsData.participants);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setJoining(false);
    }
  };

  const handleEnterContest = () => {
    router.push(`/contests/${params.id}/solve`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error && !contest) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <p className="text-red-500 text-lg mb-4">{error}</p>
          <Link href="/contests" className="text-blue-500 hover:underline">Back to Contests</Link>
        </div>
      </div>
    );
  }

  const durationMins = Math.round((new Date(contest.end_time).getTime() - new Date(contest.start_time).getTime()) / 60000);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Contest Header Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 shadow-sm relative overflow-hidden">
          {contest.status === 'live' && (
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-500 to-orange-500" />
          )}
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{contest.title}</h1>
                {contest.status === 'live' && (
                  <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-600 text-xs font-bold uppercase tracking-wider animate-pulse flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500" /> Live
                  </span>
                )}
                {contest.status === 'ended' && (
                  <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 text-xs font-bold uppercase tracking-wider">
                    Ended
                  </span>
                )}
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-lg">{contest.description || 'No description provided.'}</p>
            </div>

            <div className="flex flex-col items-end gap-3 w-full md:w-auto">
              {contest.status === 'upcoming' && (
                <div className="text-center bg-gray-50 dark:bg-gray-900 px-6 py-3 rounded-xl border border-gray-200 dark:border-gray-700 w-full md:w-auto">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Starts In</p>
                  <p className="text-2xl font-bold font-mono text-gray-900 dark:text-white tabular-nums">{timeToStart}</p>
                </div>
              )}

              {error && <p className="text-sm text-red-500">{error}</p>}

              {contest.status !== 'ended' ? (
                isParticipant ? (
                  contest.status === 'live' ? (
                    <Button onClick={handleEnterContest} className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white px-8 py-6 rounded-xl font-bold text-lg flex items-center gap-2 shadow-lg hover:scale-105 transition">
                      <Play className="w-6 h-6 fill-current" /> Enter Contest
                    </Button>
                  ) : (
                    <div className="w-full md:w-auto text-center px-8 py-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-bold rounded-xl border border-green-200 dark:border-green-800/50 flex items-center justify-center gap-2">
                      <span className="text-xl">✓</span> Joined (Waiting to start)
                    </div>
                  )
                ) : (
                  <Button 
                    onClick={handleJoin} 
                    disabled={joining || (contest.max_participants && participantCount >= contest.max_participants)}
                    className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 rounded-xl font-bold text-lg flex items-center gap-2 shadow-lg transition"
                  >
                    {joining ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Join Contest'}
                  </Button>
                )
              ) : (
                <Link href={`/contests/${contest.id}/solve`}>
                  <Button variant="outline" className="w-full md:w-auto">View Results</Button>
                </Link>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8 pt-8 border-t border-gray-100 dark:border-gray-700/50">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1.5"><Calendar className="w-4 h-4"/> Start Date</p>
              <p className="font-semibold text-gray-900 dark:text-white">{new Date(contest.start_time).toLocaleDateString()}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{new Date(contest.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1.5"><Clock className="w-4 h-4"/> Duration</p>
              <p className="font-semibold text-gray-900 dark:text-white">{durationMins} minutes</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1.5"><Users className="w-4 h-4"/> Participants</p>
              <p className="font-semibold text-gray-900 dark:text-white">{participantCount} / {contest.max_participants || '∞'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1.5">Problems</p>
              <p className="font-semibold text-gray-900 dark:text-white">{problems.length} Challenges</p>
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid md:grid-cols-2 gap-8">
          
          {/* Problem List (Only titles/difficulty, descriptions hidden until start) */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Problems</h2>
            <div className="space-y-3">
              {problems.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700/50">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
                      {p.position}
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {contest.status === 'upcoming' ? 'Problem Hidden' : p.title}
                    </span>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    p.difficulty === 'Easy' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                    p.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {p.difficulty}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Participants */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Participants</h2>
              <span className="text-sm font-medium text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md">
                {participantCount} Joined
              </span>
            </div>
            
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-4">
              {participants.map((user, idx) => (
                <div key={idx} className="flex flex-col items-center gap-2 group">
                  {user.image_url ? (
                    <img src={user.image_url} alt={user.username || 'User'} className="w-12 h-12 rounded-full border-2 border-gray-200 dark:border-gray-700" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-sm">
                      {(user.username || user.full_name || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <span className="text-xs text-center text-gray-600 dark:text-gray-400 truncate w-full px-1">
                    {user.username || user.full_name || 'Anonymous'}
                  </span>
                </div>
              ))}
              
              {participants.length === 0 && (
                <div className="col-span-full text-center py-8 text-gray-500">
                  Be the first to join!
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
