'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Activity, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Clock, 
  Cpu, 
  ShieldAlert, 
  ExternalLink, 
  Calendar,
  Code
} from 'lucide-react';
import { useAuth } from '@clerk/nextjs';

interface LiveSubmission {
  id: string;
  user_id: string;
  problem_id: string;
  language: string;
  status: string;
  runtime?: number;
  memory_usage?: number;
  submitted_at: string;
  auto_submitted: boolean;
  problems?: {
    title: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
  };
  users?: {
    username?: string;
    full_name?: string;
    image_url?: string;
  };
}

export default function ActivityPage() {
  const [submissions, setSubmissions] = useState<LiveSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userId } = useAuth();

  const fetchLiveSubmissions = async () => {
    try {
      const response = await fetch('/api/submissions/live');
      if (!response.ok) {
        throw new Error('Failed to fetch live submissions');
      }
      const data = await response.json();
      setSubmissions(data.submissions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveSubmissions();

    // Poll every 10 seconds for new submissions
    const interval = setInterval(fetchLiveSubmissions, 10000);
    return () => clearInterval(interval);
  }, []);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Accepted':
        return {
          bg: 'bg-green-50 dark:bg-green-950/20',
          border: 'border-green-200 dark:border-green-900/50',
          text: 'text-green-700 dark:text-green-400',
          icon: <CheckCircle2 className="w-5 h-5 text-green-500" />
        };
      case 'Wrong Answer':
        return {
          bg: 'bg-red-50 dark:bg-red-950/20',
          border: 'border-red-200 dark:border-red-900/50',
          text: 'text-red-700 dark:text-red-400',
          icon: <XCircle className="w-5 h-5 text-red-500" />
        };
      default:
        return {
          bg: 'bg-amber-50 dark:bg-amber-950/20',
          border: 'border-amber-200 dark:border-amber-900/50',
          text: 'text-amber-700 dark:text-amber-400',
          icon: <AlertCircle className="w-5 h-5 text-amber-500" />
        };
    };
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'Easy':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900/30';
      case 'Medium':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-900/30';
      case 'Hard':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/30';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gradient-to-br dark:from-gray-900 dark:via-black dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-neutral-400">Loading submissions feed...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gradient-to-br dark:from-gray-900 dark:via-black dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">Error: {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gradient-to-br dark:from-gray-900 dark:via-black dark:to-gray-800">
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Activity className="w-12 h-12 text-blue-500 animate-pulse" />
            <h1 className="text-5xl font-bold text-gray-900 dark:text-neutral-100">
              Live Submissions Feed
            </h1>
          </div>
          <p className="text-gray-700 dark:text-neutral-400 text-lg">
            Real-time streaming activity of developer submissions across CodeSprint.
          </p>
        </div>

        {/* Live List */}
        <div className="space-y-4">
          {submissions.length === 0 ? (
            <div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-md border border-gray-200 dark:border-gray-700 rounded-2xl p-12 text-center text-gray-500 dark:text-neutral-400">
              No submissions tracked yet. Be the first to run code!
            </div>
          ) : (
            submissions.map((sub) => {
              const statusStyle = getStatusStyle(sub.status);
              const isCurrentUser = sub.user_id === userId;

              return (
                <div
                  key={sub.id}
                  className={`relative p-5 bg-white/80 dark:bg-gray-800/40 backdrop-blur-md border rounded-2xl shadow-sm transition hover:shadow-md ${
                    isCurrentUser 
                      ? 'border-blue-500/40 dark:border-blue-500/30 bg-blue-50/10' 
                      : 'border-gray-200/60 dark:border-gray-700/50'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* User and Problem Info */}
                    <div className="flex items-center gap-3">
                      {sub.users?.image_url ? (
                        <img
                          src={sub.users.image_url}
                          alt={sub.users.username || 'Coder'}
                          className="w-11 h-11 rounded-full border border-gray-200 dark:border-gray-700"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold">
                          {(sub.users?.username || 'C')[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 dark:text-neutral-100">
                            {sub.users?.username || sub.users?.full_name || 'Anonymous'}
                          </span>
                          {isCurrentUser && (
                            <span className="text-[10px] uppercase font-bold tracking-wider bg-blue-600 text-white px-2 py-0.5 rounded-full">
                              You
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Link
                            href={`/problems/${sub.problem_id}`}
                            className="text-sm font-semibold text-gray-700 hover:text-blue-600 dark:text-neutral-300 dark:hover:text-blue-400 flex items-center gap-1 group"
                          >
                            {sub.problems?.title || 'Unknown Problem'}
                            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </Link>
                          <span className={`text-[11px] px-2 py-0.5 font-bold rounded-md border ${getDifficultyColor(sub.problems?.difficulty)}`}>
                            {sub.problems?.difficulty || 'Easy'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Stats & Status Badges */}
                    <div className="flex flex-wrap items-center gap-3 sm:gap-4 md:justify-end">
                      {/* Auto Submitted Banner */}
                      {sub.auto_submitted && (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 rounded-xl text-xs font-bold shadow-sm animate-pulse">
                          <ShieldAlert className="w-4 h-4" />
                          Auto-Submit
                        </div>
                      )}

                      {/* Code Info */}
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-100 dark:bg-gray-900/50 text-gray-600 dark:text-neutral-300 rounded-xl text-xs font-semibold">
                        <Code className="w-3.5 h-3.5" />
                        {sub.language}
                      </div>

                      {/* Runtime Info */}
                      {sub.status === 'Accepted' && sub.runtime !== undefined && (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-100 dark:bg-gray-900/50 text-gray-600 dark:text-neutral-300 rounded-xl text-xs font-semibold">
                          <Clock className="w-3.5 h-3.5 text-blue-500" />
                          {sub.runtime} ms
                        </div>
                      )}

                      {/* Memory Info */}
                      {sub.status === 'Accepted' && sub.memory_usage !== undefined && (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-100 dark:bg-gray-900/50 text-gray-600 dark:text-neutral-300 rounded-xl text-xs font-semibold">
                          <Cpu className="w-3.5 h-3.5 text-purple-500" />
                          {sub.memory_usage} KB
                        </div>
                      )}

                      {/* Status Tag */}
                      <div className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl border text-sm font-bold shadow-sm ${statusStyle.bg} ${statusStyle.border} ${statusStyle.text}`}>
                        {statusStyle.icon}
                        {sub.status}
                      </div>
                    </div>
                  </div>

                  {/* Absolute Time */}
                  <div className="absolute top-2 right-4 text-[10px] text-gray-400 dark:text-neutral-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(sub.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Refresh Note */}
        <div className="mt-8 text-center text-sm text-neutral-400 flex items-center justify-center gap-2">
          <Clock className="w-4 h-4" />
          Live submissions feed auto-refreshes every 10 seconds
        </div>
      </div>
    </div>
  );
}
