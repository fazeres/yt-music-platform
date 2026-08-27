import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Play, Trash2, GripVertical, Music } from 'lucide-react';
import { usePlayerStore, useAuthStore } from '../store';
import { Playlist, Track } from '../types';

export const PlaylistPage: React.FC<{
  onPlaylistUpdated: () => void;
}> = ({ onPlaylistUpdated }) => {
  const { id } = useParams<{ id: string }>();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState(true);

  const token = useAuthStore((s) => s.token);
  const { playTrack } = usePlayerStore();

  const fetchPlaylist = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/library/playlists/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPlaylist(data.playlist);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlaylist();
  }, [id, token]);

  const handleRemoveTrack = async (trackId: string) => {
    if (!id) return;
    await fetch(`/api/library/playlists/${id}/tracks/${trackId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchPlaylist();
    onPlaylistUpdated();
  };

  const tracks = (playlist?.tracks || []).map((pt) => pt.track);

  if (loading) return <div className="p-8 text-[#b3b3b3]">Loading playlist...</div>;
  if (!playlist) return <div className="p-8 text-[#b3b3b3]">Playlist not found.</div>;

  return (
    <div className="p-8 pb-32 space-y-6">
      {/* Header */}
      <div className="flex items-end space-x-6 pb-6 border-b border-[#282828]">
        <div className="w-48 h-48 bg-gradient-to-br from-[#333] to-[#181818] shadow-2xl flex items-center justify-center rounded-lg">
          <Music className="w-20 h-20 text-[#b3b3b3]" />
        </div>
        <div>
          <div className="text-xs uppercase font-bold text-[#b3b3b3]">Playlist</div>
          <h1 className="text-4xl font-extrabold text-white mt-1 mb-3">{playlist.name}</h1>
          <div className="text-sm text-[#b3b3b3]">
            {playlist.tracks.length} {playlist.tracks.length === 1 ? 'song' : 'songs'}
          </div>
        </div>
      </div>

      {/* Action Bar */}
      {tracks.length > 0 && (
        <div className="flex items-center space-x-4">
          <button
            onClick={() => playTrack(tracks[0], tracks)}
            className="w-12 h-12 rounded-full bg-spotify-green text-black flex items-center justify-center hover:scale-105 transition shadow-lg"
          >
            <Play className="w-6 h-6 fill-current ml-0.5" />
          </button>
        </div>
      )}

      {/* Tracks Table */}
      <div className="space-y-1">
        {playlist.tracks.map((pt, idx) => (
          <div
            key={pt.id}
            className="group flex items-center justify-between p-2 rounded-md hover:bg-[#282828] transition"
          >
            <div
              className="flex items-center space-x-4 cursor-pointer flex-1 min-w-0"
              onClick={() => playTrack(pt.track, tracks)}
            >
              <span className="text-xs text-[#b3b3b3] w-4 text-right">{idx + 1}</span>
              <img
                src={pt.track.thumbnailUrl || `https://i.ytimg.com/vi/${pt.track.videoId}/hqdefault.jpg`}
                alt={pt.track.title}
                className="w-10 h-10 rounded object-cover flex-shrink-0"
              />
              <div className="truncate">
                <div className="font-semibold text-sm text-white truncate group-hover:text-spotify-green transition">
                  {pt.track.title}
                </div>
                <div className="text-xs text-[#b3b3b3] truncate">{pt.track.artist}</div>
              </div>
            </div>

            <button
              onClick={() => handleRemoveTrack(pt.track.id || pt.id)}
              className="text-[#b3b3b3] hover:text-red-400 opacity-0 group-hover:opacity-100 transition p-2"
              title="Remove from playlist"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
