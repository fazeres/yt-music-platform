import React, { useEffect, useState } from 'react';
import { Heart, Play } from 'lucide-react';
import { usePlayerStore, useAuthStore } from '../store';
import { Track } from '../types';

export const FavoritesPage: React.FC = () => {
  const [favorites, setFavorites] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  const token = useAuthStore((s) => s.token);
  const { playTrack } = usePlayerStore();

  const fetchFavorites = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/library/favorites', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setFavorites(data.favorites || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, [token]);

  return (
    <div className="p-8 pb-32 space-y-6">
      {/* Header */}
      <div className="flex items-end space-x-6 pb-6 border-b border-[#282828]">
        <div className="w-48 h-48 bg-gradient-to-br from-indigo-600 to-purple-800 shadow-2xl flex items-center justify-center rounded-lg">
          <Heart className="w-20 h-20 fill-white text-white" />
        </div>
        <div>
          <div className="text-xs uppercase font-bold text-[#b3b3b3]">Playlist</div>
          <h1 className="text-4xl font-extrabold text-white mt-1 mb-3">Liked Songs</h1>
          <div className="text-sm text-[#b3b3b3]">
            {favorites.length} {favorites.length === 1 ? 'song' : 'songs'}
          </div>
        </div>
      </div>

      {/* Action Bar */}
      {favorites.length > 0 && (
        <div className="flex items-center space-x-4">
          <button
            onClick={() => playTrack(favorites[0], favorites)}
            className="w-12 h-12 rounded-full bg-spotify-green text-black flex items-center justify-center hover:scale-105 transition shadow-lg"
          >
            <Play className="w-6 h-6 fill-current ml-0.5" />
          </button>
        </div>
      )}

      {/* Tracks List */}
      <div className="space-y-1">
        {favorites.map((track, idx) => (
          <div
            key={track.videoId}
            className="group flex items-center justify-between p-2 rounded-md hover:bg-[#282828] transition cursor-pointer"
            onClick={() => playTrack(track, favorites)}
          >
            <div className="flex items-center space-x-4 flex-1 min-w-0">
              <span className="text-xs text-[#b3b3b3] w-4 text-right">{idx + 1}</span>
              <img
                src={track.thumbnailUrl || `https://i.ytimg.com/vi/${track.videoId}/hqdefault.jpg`}
                alt={track.title}
                className="w-10 h-10 rounded object-cover flex-shrink-0"
              />
              <div className="truncate">
                <div className="font-semibold text-sm text-white truncate group-hover:text-spotify-green transition">
                  {track.title}
                </div>
                <div className="text-xs text-[#b3b3b3] truncate">{track.artist}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
