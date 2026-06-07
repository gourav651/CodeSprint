'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { Trophy, Clock, Users, Plus, Calendar, Lock } from 'lucide-react';

interface Contest {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  status: 'upcoming' | 'live' | 'ended';
  participant_count: number;
  max_participants: number;
}

export default function ContestsPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/contests')
      .then((res) => res.json())
      .then((data) => {
        setContests(data.contests || []);
        setLoading(false);
      });
  }, []);

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getDuration = (start: string, end: string) => {
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    const mins = Math.round((e - s) / 60000);
    return `${mins} mins`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const live = contests.filter((c) => c.status === 'live');
  const upcoming = contests.filter((c) => c.status === 'upcoming');
  const ended = contests.filter((c) => c.status === 'ended');

  const ContestCard = ({ contest }: { contest: Contest }) => (
    <Link href={`/contests/${contest.id}`}>
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition group h-full flex flex-col">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
            {contest.title}
          </h3>
          {contest.status === 'live' && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold uppercase tracking-wider animate-pulse">
              <span className="w-2 h-2 rounded-full bg-red-500"></span> Live
            </span>
          )}
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 line-clamp-2 flex-1">
          {contest.description}
        </p>
        <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm text-gray-500 dark:text-gray-400 mt-auto">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(contest.start_time)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>{getDuration(contest.start_time, contest.end_time)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>
              {contest.participant_count} / {contest.max_participants || '∞'} joined
            </span>
          </div>
        </div>
      </div>
    </Link>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-12">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Trophy className="w-10 h-10 text-yellow-500" />
              Live Contests
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Compete against others in real-time, see live leaderboards, and code together.
            </p>
          </div>
          {isLoaded && isSignedIn ? (
            <Link
              href="/contests/create"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition shadow-sm flex items-center gap-2"
            >
              <Plus className="w-5 h-5" /> Create Contest
            </Link>
          ) : (
            <Link
              href="/sign-in"
              className="px-5 py-2.5 bg-gray-800 dark:bg-gray-700 hover:bg-gray-700 dark:hover:bg-gray-600 text-white font-medium rounded-lg transition shadow-sm flex items-center gap-2"
            >
              <Lock className="w-5 h-5" /> Sign in to Create
            </Link>
          )}
        </div>

        {live.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></span>
              Happening Now
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {live.map((c) => (
                <ContestCard key={c.id} contest={c} />
              ))}
            </div>
          </section>
        )}

        {upcoming.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Upcoming Contests</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcoming.map((c) => (
                <ContestCard key={c.id} contest={c} />
              ))}
            </div>
          </section>
        )}

        {ended.length > 0 && (
          <section className="opacity-80">
            <h2 className="text-xl font-bold text-gray-600 dark:text-gray-400 mb-6">Past Contests</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ended.map((c) => (
                <ContestCard key={c.id} contest={c} />
              ))}
            </div>
          </section>
        )}

        {contests.length === 0 && (
          <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
            <Trophy className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">No Contests Yet</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              Be the first to create a live coding contest and invite others to join!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
