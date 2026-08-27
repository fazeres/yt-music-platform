import React, { useEffect, useState } from 'react';
import { BarChart2, Clock, Music, Award } from 'lucide-react';
import { useAuthStore } from '../store';
import { ListeningStats } from '../types';

export const StatsPage: React.FC = () => {
  const [stats, setStats] = useState<ListeningStats | null>(null);
  const [loading, setLoading] = useState(true);
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/library/history/stats', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [token]);

  if (loading) return <div className="p-8 text-[#b3b3b3]">Loading your listening stats...</div>;
  if (!stats) return <div className="p-8 text-[#b3b3b3]">No stats available yet. Start listening!</div>;

  return (
    <div className="p-8 pb-32 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold flex items-center space-x-3">
          <Award className="w-8 h-8 text-spotify-green" />
          <span>Your Year in Review & Stats</span>
        </h1>
        <p className="text-[#b3b3b3] text-sm mt-1">Aggregated insights from your personal streaming history</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#181818] p-6 rounded-xl border border-[#282828] flex items-center space-x-4">
          <div className="p-3 bg-spotify-green/20 rounded-lg text-spotify-green">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{stats.totalListeningMinutes} mins</div>
            <div className="text-xs text-[#b3b3b3]">Total Listening Time</div>
          </div>
        </div>

        <div className="bg-[#181818] p-6 rounded-xl border border-[#282828] flex items-center space-x-4">
          <div className="p-3 bg-indigo-500/20 rounded-lg text-indigo-400">
            <Music className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{stats.totalTracksPlayed}</div>
            <div className="text-xs text-[#b3b3b3]">Total Songs Streamed</div>
          </div>
        </div>
      </div>

      {/* Top Artists Chart */}
      <section className="bg-[#181818] p-6 rounded-xl border border-[#282828]">
        <h2 className="text-lg font-bold mb-4">Top Artists</h2>
        <div className="space-y-3">
          {stats.topArtists.slice(0, 5).map((item, idx) => {
            const maxPlays = stats.topArtists[0]?.plays || 1;
            const percentage = (item.plays / maxPlays) * 100;
            return (
              <div key={item.artist} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span>{idx + 1}. {item.artist}</span>
                  <span className="text-[#b3b3b3]">{item.plays} plays</span>
                </div>
                <div className="w-full bg-[#282828] h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-spotify-green h-full rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Top Tracks */}
      <section className="bg-[#181818] p-6 rounded-xl border border-[#282828]">
        <h2 className="text-lg font-bold mb-4">Top Tracks</h2>
        <div className="space-y-2">
          {stats.topTracks.slice(0, 5).map((item, idx) => (
            <div key={item.track.videoId} className="flex items-center justify-between p-2 rounded hover:bg-[#282828]">
              <div className="flex items-center space-x-3">
                <span className="text-xs text-[#b3b3b3] font-bold w-4">{idx + 1}</span>
                <img
                  src={item.track.thumbnailUrl || `https://i.ytimg.com/vi/${item.track.videoId}/hqdefault.jpg`}
                  alt={item.track.title}
                  className="w-10 h-10 rounded object-cover"
                />
                <div>
                  <div className="text-sm font-semibold text-white">{item.track.title}</div>
                  <div className="text-xs text-[#b3b3b3]">{item.track.artist}</div>
                </div>
              </div>
              <div className="text-xs font-medium text-spotify-green">{item.plays} plays</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
