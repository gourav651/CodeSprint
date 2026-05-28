'use client';

import { useState, useEffect } from 'react';
import { Lock, Medal, Star } from 'lucide-react';

interface Badge {
  id: string;
  name: string;
  description: string;
  emoji: string;
  color: string;
  glowColor: string;
  unlocked: boolean;
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

export default function AchievementsPage() {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
  }, []);

  const unlockedCount = badges.filter(b => b.unlocked).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gradient-to-br dark:from-gray-900 dark:via-black dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-neutral-400">Loading achievements...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gradient-to-br dark:from-gray-900 dark:via-black dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">Error: {error}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">Retry</button>
        </div>
      </div>
    );
  }

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
            ].map(item => (
              <div key={item.label} className="bg-white/80 dark:bg-gray-800/50 backdrop-blur border border-gray-200/60 dark:border-gray-700/50 rounded-2xl p-5 text-center shadow-sm">
                <p className={`text-3xl font-bold ${item.color}`}>{item.value}</p>
                <p className="text-sm text-gray-500 dark:text-neutral-400 mt-1">{item.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Badge Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {badges.map(badge => {
            const progressPct = badge.progress.target > 0
              ? Math.min((badge.progress.current / badge.progress.target) * 100, 100)
              : 0;

            return (
              <div
                key={badge.id}
                className={`relative p-6 rounded-2xl border transition-all duration-300 ${
                  badge.unlocked
                    ? `bg-white/90 dark:bg-gray-800/70 border-gray-200/80 dark:border-gray-600/60 shadow-lg ${badge.glowColor} shadow-lg`
                    : 'bg-white/50 dark:bg-gray-900/40 border-gray-200/40 dark:border-gray-800/40 opacity-60'
                }`}
              >
                {/* Lock overlay icon */}
                {!badge.unlocked && (
                  <div className="absolute top-4 right-4">
                    <Lock className="w-4 h-4 text-gray-400 dark:text-gray-600" />
                  </div>
                )}

                {/* Unlocked glow ring on emoji */}
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

                {/* Unlocked ribbon */}
                {badge.unlocked && (
                  <div className={`absolute top-4 right-4 text-xs font-bold px-2 py-0.5 rounded-full bg-gradient-to-r ${badge.color} text-white shadow-sm`}>
                    ✓ Earned
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
