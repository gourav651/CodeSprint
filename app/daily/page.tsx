'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Flame, Clock, Trophy, CheckCircle2, ArrowRight,
  Calendar, Zap, Medal, Users, Star, Lock
} from 'lucide-react';
import { useAuth } from '@clerk/nextjs';

interface Problem {
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  category: string;
  description: string;
}

interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string | null;
  full_name: string | null;
  image_url: string | null;
  submitted_at: string;
  runtime: number | null;
}

interface Streak {
  current_streak: number;
  longest_streak: number;
  last_completed: string | null;
}

interface DailyData {
  problem: Problem;
  challengeDate: string;
  totalCompletions: number;
  completedByCurrentUser: boolean;
  userCompletionTime: string | null;
  userRuntime: number | null;
  streak: Streak | null;
}

function difficultyColor(d?: string) {
  switch (d) {
    case 'Easy':   return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-800/50';
    case 'Medium': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/40 border-yellow-200 dark:border-yellow-800/50';
    case 'Hard':   return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800/50';
    default:       return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border-gray-200';
  }
}

function useCountdown() {
  const [timeLeft, setTimeLeft] = useState({ h: 0, m: 0, s: 0 });

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      const diff = Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000));
      setTimeLeft({
        h: Math.floor(diff / 3600),
        m: Math.floor((diff % 3600) / 60),
        s: diff % 60,
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return timeLeft;
}

export default function DailyChallengePage() {
  const { userId, isLoaded } = useAuth();
  const [data, setData] = useState<DailyData | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const countdown = useCountdown();

  const fetchData = useCallback(async () => {
    try {
      const [challengeRes, lbRes] = await Promise.all([
        fetch('/api/daily-challenge'),
        fetch('/api/daily-challenge/leaderboard'),
      ]);
      if (!challengeRes.ok) throw new Error('Failed to load daily challenge');
      const challengeData = await challengeRes.json();
      const lbData = await lbRes.json();
      setData(challengeData);
      setLeaderboard(lbData.leaderboard || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // After user solves the problem, update streak (called by polling or route)
  useEffect(() => {
    if (!isLoaded || !userId || !data?.completedByCurrentUser) return;
    // Fire-and-forget streak update
    fetch('/api/daily-challenge/complete', { method: 'POST' }).catch(() => {});
  }, [data?.completedByCurrentUser, userId, isLoaded]);

  const pad = (n: number) => String(n).padStart(2, '0');

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gradient-to-br dark:from-gray-900 dark:via-black dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <Flame className="w-16 h-16 text-orange-500 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600 dark:text-neutral-400">Loading today's challenge...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gradient-to-br dark:from-gray-900 dark:via-black dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error ?? 'Failed to load challenge'}</p>
          <button onClick={fetchData} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">Retry</button>
        </div>
      </div>
    );
  }

  const { problem, challengeDate, totalCompletions, completedByCurrentUser, userCompletionTime, userRuntime, streak } = data;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gradient-to-br dark:from-gray-900 dark:via-black dark:to-gray-800">
      <div className="max-w-5xl mx-auto px-6 py-12 space-y-8">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Flame className="w-12 h-12 text-orange-500 animate-pulse" />
            <h1 className="text-5xl font-bold text-gray-900 dark:text-neutral-100">Daily Challenge</h1>
          </div>
          <div className="flex items-center justify-center gap-2 text-gray-500 dark:text-neutral-400">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(challengeDate)}</span>
          </div>
        </div>

        {/* ── Streak + Stats Row ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Countdown */}
          <div className="col-span-2 sm:col-span-2 bg-white/80 dark:bg-gray-800/50 backdrop-blur border border-gray-200/60 dark:border-gray-700/50 rounded-2xl p-5 flex flex-col items-center justify-center shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-neutral-500 mb-2 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Resets In
            </p>
            <div className="flex items-center gap-2 text-4xl font-bold font-mono text-gray-900 dark:text-neutral-100 tabular-nums">
              <span>{pad(countdown.h)}</span>
              <span className="text-orange-500 animate-pulse">:</span>
              <span>{pad(countdown.m)}</span>
              <span className="text-orange-500 animate-pulse">:</span>
              <span>{pad(countdown.s)}</span>
            </div>
            <p className="text-xs text-gray-400 dark:text-neutral-600 mt-1">HH : MM : SS</p>
          </div>

          {/* Streak */}
          <div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur border border-gray-200/60 dark:border-gray-700/50 rounded-2xl p-5 text-center shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-neutral-500 mb-1">
              {isLoaded && userId ? 'Your Streak' : 'Sign In'}
            </p>
            {isLoaded && userId && streak ? (
              <>
                <p className="text-4xl">🔥</p>
                <p className="text-2xl font-bold text-orange-500">{streak.current_streak}</p>
                <p className="text-xs text-gray-400 dark:text-neutral-500">Best: {streak.longest_streak}</p>
              </>
            ) : (
              <>
                <Lock className="w-6 h-6 text-gray-300 dark:text-gray-600 mx-auto my-1" />
                <p className="text-xs text-gray-400 dark:text-neutral-600">Sign in to track</p>
              </>
            )}
          </div>

          {/* Completions today */}
          <div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur border border-gray-200/60 dark:border-gray-700/50 rounded-2xl p-5 text-center shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-neutral-500 mb-1 flex items-center justify-center gap-1">
              <Users className="w-3.5 h-3.5" /> Solvers
            </p>
            <p className="text-3xl font-bold text-blue-500">{totalCompletions}</p>
            <p className="text-xs text-gray-400 dark:text-neutral-500">today</p>
          </div>
        </div>

        {/* ── Problem Card ───────────────────────────────────────────────── */}
        <div className={`relative rounded-3xl border shadow-xl overflow-hidden transition-all ${
          completedByCurrentUser
            ? 'border-green-400/50 dark:border-green-500/30 bg-white/90 dark:bg-gray-800/70'
            : 'border-orange-300/40 dark:border-orange-500/20 bg-white/90 dark:bg-gray-800/60'
        }`}>
          {/* Top gradient bar */}
          <div className={`h-1.5 w-full ${completedByCurrentUser ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 'bg-gradient-to-r from-orange-400 to-red-500'}`} />

          <div className="p-8">
            {/* Completed banner */}
            {completedByCurrentUser && (
              <div className="mb-5 flex items-center gap-3 px-5 py-3 rounded-2xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800/40">
                <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" />
                <div>
                  <p className="font-bold text-green-700 dark:text-green-400">Challenge Completed! 🎉</p>
                  <p className="text-sm text-green-600 dark:text-green-500">
                    Solved at {userCompletionTime ? formatTime(userCompletionTime) : '—'}
                    {userRuntime != null && ` · ${userRuntime}ms`}
                  </p>
                </div>
              </div>
            )}

            {/* Problem header */}
            <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <Zap className="w-5 h-5 text-orange-500" />
                  <span className="text-xs font-bold uppercase tracking-widest text-orange-500">Today's Problem</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-neutral-100">{problem.title}</h2>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {problem.category && (
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700/60 text-gray-500 dark:text-neutral-400 border border-gray-200/60 dark:border-gray-600/40">
                    {problem.category}
                  </span>
                )}
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${difficultyColor(problem.difficulty)}`}>
                  {problem.difficulty}
                </span>
              </div>
            </div>

            {/* Problem description preview */}
            <p className="text-gray-600 dark:text-neutral-400 text-sm leading-relaxed line-clamp-4 mb-6">
              {problem.description}
            </p>

            {/* CTA Button */}
            {isLoaded && userId ? (
              <Link
                href={`/problems/${problem.id}`}
                className={`inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl font-bold text-white shadow-lg transition-all duration-200 hover:scale-105 ${
                  completedByCurrentUser
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 hover:shadow-green-500/30'
                    : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 hover:shadow-orange-500/30'
                }`}
              >
                {completedByCurrentUser ? (
                  <><CheckCircle2 className="w-5 h-5" /> Solve Again</>
                ) : (
                  <><ArrowRight className="w-5 h-5" /> Solve Today's Challenge</>
                )}
              </Link>
            ) : (
              <Link
                href="/sign-in"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl font-bold text-white bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 shadow-lg hover:shadow-orange-500/30 transition-all duration-200 hover:scale-105"
              >
                <Lock className="w-5 h-5" /> Sign In to Solve
              </Link>
            )}
          </div>
        </div>

        {/* ── Daily Leaderboard ──────────────────────────────────────────── */}
        <div className="bg-white/80 dark:bg-gray-800/50 backdrop-blur border border-gray-200/60 dark:border-gray-700/50 rounded-3xl shadow-xl overflow-hidden">
          <div className="px-8 py-5 border-b border-gray-200 dark:border-gray-700/60 flex items-center gap-3">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-neutral-100">Today's Leaderboard</h2>
            <span className="ml-auto text-xs text-gray-400 dark:text-neutral-500">Ranked by time solved</span>
          </div>

          {leaderboard.length === 0 ? (
            <div className="py-16 text-center text-gray-400 dark:text-neutral-500">
              <Medal className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-semibold">No solvers yet — be the first!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700/40">
              {leaderboard.map((entry) => {
                const isMe = isLoaded && userId === entry.user_id;
                const rankColors: Record<number, string> = {
                  1: 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white',
                  2: 'bg-gradient-to-r from-gray-300 to-gray-500 text-white',
                  3: 'bg-gradient-to-r from-amber-500 to-amber-700 text-white',
                };
                const rankColor = rankColors[entry.rank] ?? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-neutral-300';
                const rankIcon = entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`;

                return (
                  <div
                    key={entry.user_id}
                    className={`flex items-center gap-4 px-8 py-4 transition-colors ${
                      isMe ? 'bg-blue-50/60 dark:bg-blue-900/20' : 'hover:bg-gray-50/60 dark:hover:bg-gray-700/20'
                    }`}
                  >
                    {/* Rank */}
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold shrink-0 ${rankColor}`}>
                      {entry.rank <= 3 ? rankIcon : `#${entry.rank}`}
                    </div>

                    {/* Avatar */}
                    {entry.image_url ? (
                      <img src={entry.image_url} alt={entry.username ?? 'User'} className="w-10 h-10 rounded-full border border-gray-200 dark:border-gray-700 shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shrink-0">
                        {(entry.username ?? entry.full_name ?? 'A')[0].toUpperCase()}
                      </div>
                    )}

                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 dark:text-neutral-100 truncate">
                          {entry.username ?? entry.full_name ?? 'Anonymous'}
                        </span>
                        {isMe && (
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-600 text-white px-2 py-0.5 rounded-full shrink-0">You</span>
                        )}
                        {entry.rank === 1 && (
                          <Star className="w-4 h-4 text-yellow-500 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-gray-400 dark:text-neutral-500">
                        Solved at {formatTime(entry.submitted_at)}
                      </p>
                    </div>

                    {/* Runtime */}
                    {entry.runtime != null && (
                      <div className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1 bg-gray-100 dark:bg-gray-700/60 text-gray-600 dark:text-neutral-300 rounded-xl shrink-0">
                        <Zap className="w-3 h-3 text-blue-500" />
                        {entry.runtime}ms
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Streak Info (signed in only) ───────────────────────────────── */}
        {isLoaded && userId && streak && streak.current_streak > 0 && (
          <div className="rounded-2xl border border-orange-300/40 dark:border-orange-500/20 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/10 p-6 flex items-center gap-5">
            <div className="text-5xl">🔥</div>
            <div>
              <p className="text-lg font-bold text-orange-700 dark:text-orange-400">
                {streak.current_streak} Day Streak!
              </p>
              <p className="text-sm text-orange-600/80 dark:text-orange-500/70">
                Keep it up — come back tomorrow to extend your streak. 
                Best ever: <span className="font-bold">{streak.longest_streak} days</span>.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
