import React, { useState } from 'react';
import { Search as SearchIcon, Play, Plus, Heart, Loader2 } from 'lucide-react';
import { usePlayerStore, useAuthStore } from '../store';
import { Track, Playlist } from '../types';

export const SearchPage: React.FC<{ playlists: Playlist[] }> = ({ playlists }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTrackForPlaylist, setSelectedTrackForPlaylist] = useState<Track | null>(null);

  const token = useAuthStore((s) => s.token);
  const { playTrack, addToQueue } = usePlayerStore();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
      }
    } catch (err) {
      console.error('Search request failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFavorite = async (track: Track) => {
    await fetch('/api/library/favorites', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(track),
    });
  };

  const handleAddToPlaylist = async (playlistId: string, track: Track) => {
    await fetch(`/api/library/playlists/${playlistId}/tracks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(track),
    });
    setSelectedTrackForPlaylist(null);
  };

  return (
    <div className="p-8 pb-32 space-y-6">
      {/* Search Input Bar */}
      <form onSubmit={handleSearch} className="relative max-w-xl">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-black w-5 h-5" />
        <input
          type="text"
          placeholder="What do you want to listen to? (e.g. Bohemian Rhapsody, Taylor Swift, Lo-Fi)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 rounded-full bg-white text-black font-medium placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-spotify-green transition"
        />
      </form>

      {/* Results List */}
      {loading ? (
        <div className="flex items-center space-x-2 text-[#b3b3b3]">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Searching YouTube...</span>
        </div>
      ) : (
        <div className="space-y-2">
          {results.map((track) => (
            <div
              key={track.videoId}
              className="group flex items-center justify-between p-2 rounded-md hover:bg-[#282828] transition"
            >
              {/* Left: Thumbnail & Info */}
              <div
                className="flex items-center space-x-4 cursor-pointer flex-1 min-w-0"
                onClick={() => playTrack(track, results)}
              >
                <div className="relative w-12 h-12 flex-shrink-0">
                  <img
                    src={track.thumbnailUrl || `https://i.ytimg.com/vi/${track.videoId}/hqdefault.jpg`}
                    alt={track.title}
                    className="w-12 h-12 rounded object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition rounded">
                    <Play className="w-5 h-5 fill-white text-white ml-0.5" />
                  </div>
                </div>
                <div className="truncate">
                  <div className="font-semibold text-sm text-white truncate group-hover:text-spotify-green transition">
                    {track.title}
                  </div>
                  <div className="text-xs text-[#b3b3b3] truncate">{track.artist}</div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-3 text-[#b3b3b3]">
                <button
                  onClick={() => handleFavorite(track)}
                  title="Save to Liked Songs"
                  className="hover:text-spotify-green transition p-1"
                >
                  <Heart className="w-4 h-4" />
                </button>
                <button
                  onClick={() => addToQueue(track)}
                  title="Add to queue"
                  className="hover:text-white transition text-xs border border-[#4d4d4d] px-2 py-1 rounded"
                >
                  + Queue
                </button>
                <button
                  onClick={() => setSelectedTrackForPlaylist(track)}
                  title="Add to playlist"
                  className="hover:text-white transition p-1"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add To Playlist Modal */}
      {selectedTrackForPlaylist && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#282828] p-6 rounded-xl w-full max-w-sm border border-[#3e3e3e]">
            <h3 className="text-lg font-bold mb-4">Add to playlist</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
              {playlists.map((pl) => (
                <button
                  key={pl.id}
                  onClick={() => handleAddToPlaylist(pl.id, selectedTrackForPlaylist)}
                  className="w-full text-left p-2.5 rounded bg-[#181818] hover:bg-[#333] transition text-sm font-medium"
                >
                  {pl.name}
                </button>
              ))}
            </div>
            <button
              onClick={() => setSelectedTrackForPlaylist(null)}
              className="w-full py-2 bg-transparent hover:bg-[#333] border border-[#4d4d4d] rounded-full text-sm font-semibold transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
