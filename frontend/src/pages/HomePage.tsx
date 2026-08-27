import React, { useEffect, useState } from 'react';
import { Play, Sparkles, Flame, Clock } from 'lucide-react';
import { usePlayerStore, useAuthStore } from '../store';
import { Track } from '../types';

export const HomePage: React.FC = () => {
  const [recommendations, setRecommendations] = useState<Track[]>([]);
  const [recentHistory, setRecentHistory] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const token = useAuthStore((s) => s.token);
  const { playTrack } = usePlayerStore();

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [recRes, histRes] = await Promise.all([
          fetch('/api/recommendations', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/library/history', { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        if (recRes.ok) {
          const recData = await recRes.json();
          setRecommendations(recData.recommendations || []);
        }

        if (histRes.ok) {
          const histData = await histRes.json();
          const uniqueTracks: Track[] = [];
          const seen = new Set();
          for (const item of histData.history || []) {
            if (!seen.has(item.track.videoId)) {
              seen.add(item.track.videoId);
              uniqueTracks.push(item.track);
            }
          }
          setRecentHistory(uniqueTracks.slice(0, 10));
        }
      } catch (err) {
        console.error('Failed loading home data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [token]);

  return (
    <div className="p-8 pb-32 space-y-10">
      {/* Hero Welcome */}
      <div className="bg-gradient-to-r from-emerald-800/40 via-teal-900/20 to-transparent p-6 rounded-xl border border-emerald-500/20">
        <h1 className="text-3xl font-bold mb-2">Good listening</h1>
        <p className="text-[#b3b3b3] text-sm">
          Self-hosted personal streaming engine powered by yt-dlp, Redis, and BullMQ.
        </p>
      </div>

      {/* Made For You / Recommendations */}
      <section>
        <div className="flex items-center space-x-2 mb-4">
          <Sparkles className="w-5 h-5 text-spotify-green" />
          <h2 className="text-xl font-bold">Made For You</h2>
        </div>

        {loading ? (
          <div className="text-sm text-[#b3b3b3]">Loading recommendations...</div>
        ) : recommendations.length === 0 ? (
          <div className="text-sm text-[#b3b3b3]">Search and play songs to build your recommendations!</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {recommendations.map((track) => (
              <div
                key={track.videoId}
                onClick={() => playTrack(track, recommendations)}
                className="group relative bg-[#181818] hover:bg-[#282828] p-4 rounded-lg cursor-pointer transition flex flex-col"
              >
                <div className="relative mb-3 aspect-square rounded overflow-hidden">
                  <img
                    src={track.thumbnailUrl || `https://i.ytimg.com/vi/${track.videoId}/hqdefault.jpg`}
                    alt={track.title}
                    className="w-full h-full object-cover"
                  />
                  <button
                    className="absolute right-2 bottom-2 w-10 h-10 rounded-full bg-spotify-green text-black flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 group-hover:translate-y-0 translate-y-2 transition-all"
                  >
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  </button>
                </div>
                <div className="font-semibold text-sm text-white truncate mb-1">{track.title}</div>
                <div className="text-xs text-[#b3b3b3] truncate">{track.artist}</div>
                {track.reason && (
                  <span className="text-[10px] text-spotify-green font-medium mt-2 bg-spotify-green/10 px-2 py-0.5 rounded self-start truncate max-w-full">
                    {track.reason}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recently Played */}
      {recentHistory.length > 0 && (
        <section>
          <div className="flex items-center space-x-2 mb-4">
            <Clock className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold">Recently Played</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {recentHistory.map((track) => (
              <div
                key={track.videoId}
                onClick={() => playTrack(track, recentHistory)}
                className="group relative bg-[#181818] hover:bg-[#282828] p-4 rounded-lg cursor-pointer transition flex flex-col"
              >
                <div className="relative mb-3 aspect-square rounded overflow-hidden">
                  <img
                    src={track.thumbnailUrl || `https://i.ytimg.com/vi/${track.videoId}/hqdefault.jpg`}
                    alt={track.title}
                    className="w-full h-full object-cover"
                  />
                  <button
                    className="absolute right-2 bottom-2 w-10 h-10 rounded-full bg-spotify-green text-black flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 group-hover:translate-y-0 translate-y-2 transition-all"
                  >
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  </button>
                </div>
                <div className="font-semibold text-sm text-white truncate mb-1">{track.title}</div>
                <div className="text-xs text-[#b3b3b3] truncate">{track.artist}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
