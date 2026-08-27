import React from 'react';
import { X, Trash2, GripVertical, Play } from 'lucide-react';
import { usePlayerStore } from '../store';

export const QueueDrawer: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const { queue, currentTrack, removeFromQueue, playTrack } = usePlayerStore();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-[#181818] border-l border-[#282828] z-50 p-6 flex flex-col shadow-2xl animate-fade-in">
      <div className="flex items-center justify-between pb-4 border-b border-[#282828] mb-4">
        <h2 className="text-lg font-bold text-white">Play Queue</h2>
        <button onClick={onClose} className="text-[#b3b3b3] hover:text-white p-1">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Now Playing in Queue */}
      {currentTrack && (
        <div className="mb-6">
          <div className="text-xs uppercase font-bold text-spotify-green mb-2">Now Playing</div>
          <div className="flex items-center space-x-3 p-2 bg-[#282828] rounded-lg">
            <img
              src={currentTrack.thumbnailUrl || `https://i.ytimg.com/vi/${currentTrack.videoId}/hqdefault.jpg`}
              alt={currentTrack.title}
              className="w-10 h-10 rounded object-cover"
            />
            <div className="truncate">
              <div className="text-sm font-semibold text-white truncate">{currentTrack.title}</div>
              <div className="text-xs text-[#b3b3b3] truncate">{currentTrack.artist}</div>
            </div>
          </div>
        </div>
      )}

      {/* Next In Queue */}
      <div className="flex-1 overflow-y-auto space-y-2">
        <div className="text-xs uppercase font-bold text-[#b3b3b3] mb-2">Next Up ({queue.length})</div>
        {queue.length === 0 ? (
          <div className="text-xs text-[#b3b3b3]">No tracks in queue. Add songs from search or playlists!</div>
        ) : (
          queue.map((track, idx) => (
            <div
              key={`${track.videoId}-${idx}`}
              className="group flex items-center justify-between p-2 rounded hover:bg-[#282828] transition"
            >
              <div
                className="flex items-center space-x-3 flex-1 min-w-0 cursor-pointer"
                onClick={() => playTrack(track)}
              >
                <img
                  src={track.thumbnailUrl || `https://i.ytimg.com/vi/${track.videoId}/hqdefault.jpg`}
                  alt={track.title}
                  className="w-8 h-8 rounded object-cover flex-shrink-0"
                />
                <div className="truncate">
                  <div className="text-xs font-semibold text-white truncate group-hover:text-spotify-green transition">
                    {track.title}
                  </div>
                  <div className="text-[10px] text-[#b3b3b3] truncate">{track.artist}</div>
                </div>
              </div>

              <button
                onClick={() => removeFromQueue(idx)}
                className="text-[#b3b3b3] hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
