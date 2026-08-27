import React, { useEffect, useState } from 'react';
import { HardDrive, Key, Smartphone, Trash2, Sliders, Shield } from 'lucide-react';
import { useAuthStore, usePlayerStore } from '../store';
import { UserSession } from '../types';

export const SettingsPage: React.FC = () => {
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [quota, setQuota] = useState<{ used: number; limit: number; remaining: number } | null>(null);
  const [cacheStats, setCacheStats] = useState<{ count: number; totalSizeBytes: number; maxSizeBytes: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const token = useAuthStore((s) => s.token);
  const currentSessionId = useAuthStore((s) => s.user?.sessionId);
  const { crossfadeDuration, setCrossfadeDuration } = usePlayerStore();

  const loadData = async () => {
    try {
      const [sessRes, quotaRes, cacheRes] = await Promise.all([
        fetch('/api/auth/sessions', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/quota', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/cache/stats', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (sessRes.ok) {
        const d = await sessRes.json();
        setSessions(d.sessions || []);
      }
      if (quotaRes.ok) {
        const d = await quotaRes.json();
        setQuota(d);
      }
      if (cacheRes.ok) {
        const d = await cacheRes.json();
        setCacheStats(d);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  const handleRevokeSession = async (id: string) => {
    await fetch(`/api/auth/sessions/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    loadData();
  };

  const formatMB = (bytes: number) => (bytes / (1024 * 1024)).toFixed(1);

  if (loading) return <div className="p-8 text-[#b3b3b3]">Loading settings...</div>;

  return (
    <div className="p-8 pb-32 space-y-8 max-w-4xl">
      <div>
        <h1 className="text-3xl font-extrabold">Settings & System Info</h1>
        <p className="text-[#b3b3b3] text-sm mt-1">Manage audio cache, API quota, crossfade, and device sessions</p>
      </div>

      {/* Audio Playback Settings */}
      <section className="bg-[#181818] p-6 rounded-xl border border-[#282828] space-y-4">
        <div className="flex items-center space-x-3">
          <Sliders className="w-5 h-5 text-spotify-green" />
          <h2 className="text-lg font-bold">Audio & Playback</h2>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Gapless Crossfade Duration</div>
            <div className="text-xs text-[#b3b3b3]">Overlap time between transition of consecutive songs</div>
          </div>
          <div className="flex items-center space-x-3">
            <input
              type="range"
              min={0}
              max={8}
              step={1}
              value={crossfadeDuration}
              onChange={(e) => setCrossfadeDuration(parseInt(e.target.value, 10))}
              className="w-32 h-1 bg-[#4d4d4d] rounded-lg appearance-none cursor-pointer accent-spotify-green"
            />
            <span className="text-sm font-bold w-8 text-right">{crossfadeDuration}s</span>
          </div>
        </div>
      </section>

      {/* Cache & Quota Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Cache Box */}
        <section className="bg-[#181818] p-6 rounded-xl border border-[#282828] space-y-3">
          <div className="flex items-center space-x-2">
            <HardDrive className="w-5 h-5 text-indigo-400" />
            <h2 className="text-md font-bold">Audio Disk Cache</h2>
          </div>
          {cacheStats && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-[#b3b3b3]">Cached Tracks:</span>
                <span className="font-semibold text-white">{cacheStats.count} files</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#b3b3b3]">Disk Usage:</span>
                <span className="font-semibold text-white">{formatMB(cacheStats.totalSizeBytes)} MB / {formatMB(cacheStats.maxSizeBytes)} MB</span>
              </div>
              <div className="w-full bg-[#282828] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-500 h-full rounded-full"
                  style={{ width: `${Math.min(100, (cacheStats.totalSizeBytes / cacheStats.maxSizeBytes) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </section>

        {/* YouTube API Quota Box */}
        <section className="bg-[#181818] p-6 rounded-xl border border-[#282828] space-y-3">
          <div className="flex items-center space-x-2">
            <Key className="w-5 h-5 text-yellow-400" />
            <h2 className="text-md font-bold">YouTube API Daily Quota</h2>
          </div>
          {quota && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-[#b3b3b3]">Daily Units Used:</span>
                <span className="font-semibold text-white">{quota.used} / {quota.limit}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#b3b3b3]">Remaining:</span>
                <span className="font-semibold text-white">{quota.remaining}</span>
              </div>
              <div className="w-full bg-[#282828] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-yellow-400 h-full rounded-full"
                  style={{ width: `${Math.min(100, (quota.used / quota.limit) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Connected Device Sessions */}
      <section className="bg-[#181818] p-6 rounded-xl border border-[#282828] space-y-4">
        <div className="flex items-center space-x-3">
          <Smartphone className="w-5 h-5 text-spotify-green" />
          <h2 className="text-lg font-bold">Connected Devices & Sessions</h2>
        </div>
        <div className="space-y-2">
          {sessions.map((sess) => (
            <div
              key={sess.id}
              className="flex items-center justify-between p-3 rounded-lg bg-[#212121] border border-[#2d2d2d]"
            >
              <div>
                <div className="text-sm font-semibold flex items-center space-x-2">
                  <span>{sess.deviceName}</span>
                  {sess.id === currentSessionId && (
                    <span className="text-[10px] bg-spotify-green/20 text-spotify-green px-1.5 py-0.5 rounded font-bold">
                      Current Device
                    </span>
                  )}
                </div>
                <div className="text-xs text-[#b3b3b3]">
                  Last active: {new Date(sess.lastActiveAt).toLocaleString()}
                </div>
              </div>

              {sess.id !== currentSessionId && (
                <button
                  onClick={() => handleRevokeSession(sess.id)}
                  className="text-xs text-red-400 hover:text-red-300 flex items-center space-x-1 p-1 rounded hover:bg-[#333]"
                  title="Revoke session"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Revoke</span>
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
