'use client';

import { useState, useEffect } from 'react';
import { Lock, Medal, Star, LogIn, Trophy } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';

interface Badge {
  id: string;
  name: string;
  description: string;
  emoji: string;
  color: string;
  glowColor: string;
  unlocked: boolean;
  unlockedAt: string | null;
  progress: { current: number; target: number };
}

interface UserStats {
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  totalSubmissions: number;
  acceptedSubmissions: number;
  acceptanceRate: number;
  minRuntime: number | null;
}

// Guest preview — all badges shown in full colour with no lock/progress clutter
const GUEST_BADGES = [
  { id: 'first_blood',    name: 'First Blood',      description: 'Solve your very first problem',          emoji: '🩸', color: 'from-red-500 to-rose-600',       hint: '1 problem' },
  { id: 'warm_up',        name: 'Warm Up',           description: 'Solve 5 or more problems',               emoji: '🔥', color: 'from-orange-500 to-amber-500',   hint: '5 problems' },
  { id: 'on_a_roll',      name: 'On A Roll',         description: 'Solve 10 or more problems',              emoji: '🚀', color: 'from-blue-500 to-indigo-600',    hint: '10 problems' },
  { id: 'easy_champion',  name: 'Easy Champion',     description: 'Solve 10 Easy problems',                 emoji: '🟢', color: 'from-green-500 to-emerald-600',  hint: '10 Easy' },
  { id: 'medium_mastery', name: 'Medium Mastery',    description: 'Solve 5 Medium problems',                emoji: '🟡', color: 'from-yellow-400 to-orange-500',  hint: '5 Medium' },
  { id: 'hard_mode',      name: 'Hard Mode',         description: 'Conquer 3 Hard problems',                emoji: '🔴', color: 'from-red-600 to-pink-700',       hint: '3 Hard' },
  { id: 'sharpshooter',   name: 'Sharpshooter',      description: 'Keep an acceptance rate ≥ 80%',          emoji: '🎯', color: 'from-purple-500 to-violet-600', hint: '≥80% rate' },
  { id: 'persistent',     name: 'Persistent Coder',  description: 'Make 20 or more total submissions',      emoji: '💪', color: 'from-cyan-500 to-teal-600',     hint: '20 submissions' },
  { id: 'speedy',         name: 'Speedy Gonzales',   description: 'Submit code with runtime under 1ms',     emoji: '⚡', color: 'from-yellow-300 to-yellow-500', hint: '<1ms runtime' },
];

function formatEarnedDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export default function AchievementsPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) { setLoading(false); return; }

    const fetchAchievements = async () => {
      try {
        const res = await fetch('/api/achievements');
        if (!res.ok) throw new Error('Failed to fetch achievements');
        const data = await res.json();
        setBadges(data.badges || []);
        setStats(data.stats || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };
    fetchAchievements();
  }, [isLoaded, isSignedIn]);

  const unlockedCount = badges.filter((b) => b.unlocked).length;

  // ── Loading ──────────────────────────────────────────────────────────────
  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gradient-to-br dark:from-gray-900 dark:via-black dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-yellow-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-neutral-400">Loading achievements...</p>
        </div>
      </div>
    );
  }

  // ── Guest view ────────────────────────────────────────────────────────────
  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gradient-to-br dark:from-gray-900 dark:via-black dark:to-gray-800">
        <div className="max-w-6xl mx-auto px-6 py-12">

          {/* Header */}
          <div className="text-center mb-10">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Medal className="w-12 h-12 text-yellow-500" />
              <h1 className="text-5xl font-bold text-gray-900 dark:text-neutral-100">Achievements</h1>
            </div>
            <p className="text-gray-600 dark:text-neutral-400 text-lg">
              Unlock badges by hitting milestones on your coding journey.
            </p>
          </div>

          {/* Sign-in CTA Banner */}
          <div className="relative mb-12 overflow-hidden rounded-3xl border border-yellow-400/30 dark:border-yellow-500/20 bg-gradient-to-br from-yellow-50 via-orange-50 to-amber-50 dark:from-yellow-950/30 dark:via-orange-950/20 dark:to-amber-950/10 p-8 text-center shadow-xl">
            <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 w-72 h-40 bg-yellow-400/20 blur-3xl rounded-full" />
            <Trophy className="mx-auto mb-4 w-14 h-14 text-yellow-500 drop-shadow-lg" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-neutral-100 mb-2">
              Sign in to track your achievements
            </h2>
            <p className="text-gray-600 dark:text-neutral-400 mb-6 max-w-md mx-auto">
              Create a free account to unlock badges, track your coding milestones, and compete with other developers.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link
                href="/sign-in"
                className="inline-flex items-center gap-2 px-7 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white font-bold rounded-2xl shadow-lg hover:shadow-yellow-500/30 transition-all duration-200 hover:scale-105"
              >
                <LogIn className="w-5 h-5" />
                Sign In
              </Link>
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-2 px-7 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-neutral-200 font-bold rounded-2xl shadow hover:shadow-md transition-all duration-200 hover:scale-105"
              >
                Create Account
              </Link>
            </div>
          </div>

          {/* Section label */}
          <p className="text-sm font-semibold text-gray-500 dark:text-neutral-500 mb-5 uppercase tracking-widest text-center">
            {GUEST_BADGES.length} Badges to Earn
          </p>

          {/* Full-colour badge preview grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {GUEST_BADGES.map((badge) => (
              <div
                key={badge.id}
                className="group relative p-6 rounded-2xl border border-gray-200/60 dark:border-gray-700/40 bg-white/80 dark:bg-gray-800/40 backdrop-blur shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
              >
                {/* Coloured emoji icon */}
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-4 bg-gradient-to-br ${badge.color} shadow-md`}>
                  {badge.emoji}
                </div>

                <h3 className="text-lg font-bold mb-1 text-gray-900 dark:text-neutral-100">
                  {badge.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-neutral-400 mb-4">
                  {badge.description}
                </p>

                {/* Goal hint pill */}
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700/60 text-gray-500 dark:text-neutral-400 border border-gray-200/60 dark:border-gray-600/40">
                  🎯 Goal: {badge.hint}
                </span>

                {/* Sign in to earn overlay on hover */}
                <div className="absolute inset-0 rounded-2xl flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <Link
                    href="/sign-in"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-gray-900 font-bold rounded-xl text-sm shadow-lg hover:bg-yellow-400 transition-colors"
                  >
                    <LogIn className="w-4 h-4" />
                    Sign in to earn
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Error (signed in but fetch failed) ───────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gradient-to-br dark:from-gray-900 dark:via-black dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">Error: {error}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ── Authenticated view ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gradient-to-br dark:from-gray-900 dark:via-black dark:to-gray-800">
      <div className="max-w-6xl mx-auto px-6 py-12">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Medal className="w-12 h-12 text-yellow-500" />
            <h1 className="text-5xl font-bold text-gray-900 dark:text-neutral-100">Achievements</h1>
          </div>
          <p className="text-gray-600 dark:text-neutral-400 text-lg">
            Unlock badges by hitting milestones on your coding journey.
          </p>

          {/* Progress Summary Bar */}
          <div className="mt-6 inline-flex items-center gap-3 px-6 py-3 bg-white/80 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm">
            <Star className="w-5 h-5 text-yellow-500" />
            <span className="font-semibold text-gray-900 dark:text-neutral-100 text-lg">
              {unlockedCount} / {badges.length} Badges Unlocked
            </span>
            <div className="ml-2 w-32 h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full transition-all duration-700"
                style={{ width: `${badges.length > 0 ? (unlockedCount / badges.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Stats Row */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
            {[
              { label: 'Total Solved', value: stats.totalSolved, color: 'text-blue-500' },
              { label: 'Easy', value: stats.easySolved, color: 'text-green-500' },
              { label: 'Medium', value: stats.mediumSolved, color: 'text-yellow-500' },
              { label: 'Hard', value: stats.hardSolved, color: 'text-red-500' },
            ].map((item) => (
              <div key={item.label} className="bg-white/80 dark:bg-gray-800/50 backdrop-blur border border-gray-200/60 dark:border-gray-700/50 rounded-2xl p-5 text-center shadow-sm">
                <p className={`text-3xl font-bold ${item.color}`}>{item.value}</p>
                <p className="text-sm text-gray-500 dark:text-neutral-400 mt-1">{item.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Badge Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {badges.map((badge) => {
            const progressPct =
              badge.progress.target > 0
                ? Math.min((badge.progress.current / badge.progress.target) * 100, 100)
                : 0;

            return (
              <div
                key={badge.id}
                className={`relative p-6 rounded-2xl border transition-all duration-300 ${
                  badge.unlocked
                    ? `bg-white/90 dark:bg-gray-800/70 border-gray-200/80 dark:border-gray-600/60 shadow-lg ${badge.glowColor}`
                    : 'bg-white/50 dark:bg-gray-900/40 border-gray-200/40 dark:border-gray-800/40 opacity-60'
                }`}
              >
                {/* Lock icon (locked only) */}
                {!badge.unlocked && (
                  <div className="absolute top-4 right-4">
                    <Lock className="w-4 h-4 text-gray-400 dark:text-gray-600" />
                  </div>
                )}

                {/* Emoji icon */}
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-4 ${
                  badge.unlocked
                    ? `bg-gradient-to-br ${badge.color} shadow-md`
                    : 'bg-gray-200 dark:bg-gray-800 grayscale'
                }`}>
                  {badge.emoji}
                </div>

                <h3 className={`text-lg font-bold mb-1 ${badge.unlocked ? 'text-gray-900 dark:text-neutral-100' : 'text-gray-500 dark:text-neutral-500'}`}>
                  {badge.name}
                </h3>
                <p className={`text-sm mb-4 ${badge.unlocked ? 'text-gray-600 dark:text-neutral-400' : 'text-gray-400 dark:text-neutral-600'}`}>
                  {badge.description}
                </p>

                {/* Progress bar */}
                <div className="mt-auto">
                  <div className="flex justify-between text-xs text-gray-400 dark:text-neutral-500 mb-1.5">
                    <span>Progress</span>
                    <span>{badge.progress.current} / {badge.progress.target}</span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        badge.unlocked
                          ? `bg-gradient-to-r ${badge.color}`
                          : 'bg-gray-400 dark:bg-gray-600'
                      }`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>

                {/* Earned ribbon with date */}
                {badge.unlocked && (
                  <div className="mt-3 flex items-center justify-between">
                    <div className={`text-xs font-bold px-2 py-0.5 rounded-full bg-gradient-to-r ${badge.color} text-white shadow-sm`}>
                      ✓ Earned
                    </div>
                    {badge.unlockedAt && (
                      <span className="text-[11px] text-gray-400 dark:text-neutral-500">
                        {formatEarnedDate(badge.unlockedAt)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
