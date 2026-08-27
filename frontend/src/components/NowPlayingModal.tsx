import React from 'react';
import { ChevronDown, Play, Pause, SkipBack, SkipForward, Volume2, Sparkles, Download } from 'lucide-react';
import { usePlayerStore } from '../store';

export const NowPlayingModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const {
    currentTrack,
    isPlaying,
    progressSeconds,
    durationSeconds,
    volume,
    isResolving,
    togglePlay,
    seek,
    setVolume,
    nextTrack,
    prevTrack,
  } = usePlayerStore();

  if (!isOpen || !currentTrack) return null;

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-[#3a2d54] via-[#1a1528] to-[#121212] flex flex-col p-6 md:p-12 overflow-y-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={onClose}
          className="p-2 text-[#b3b3b3] hover:text-white rounded-full bg-black/20 hover:bg-black/40 transition"
        >
          <ChevronDown className="w-6 h-6" />
        </button>
        <span className="text-xs font-bold uppercase tracking-wider text-[#b3b3b3]">
          Now Playing
        </span>
        <div className="w-10" />
      </div>

      {/* Main Cover & Metadata */}
      <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full">
        <div className="w-full aspect-square rounded-2xl overflow-hidden shadow-2xl mb-8 relative group">
          <img
            src={currentTrack.thumbnailUrl || `https://i.ytimg.com/vi/${currentTrack.videoId}/hqdefault.jpg`}
            alt={currentTrack.title}
            className="w-full h-full object-cover"
          />
          {isResolving && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center space-y-2">
              <Sparkles className="w-8 h-8 text-spotify-green animate-spin" />
              <span className="text-sm font-semibold text-white">Extracting & Caching Audio...</span>
            </div>
          )}
        </div>

        <div className="w-full flex items-center justify-between mb-6">
          <div className="truncate pr-4">
            <h1 className="text-2xl font-bold text-white truncate mb-1">{currentTrack.title}</h1>
            <p className="text-lg text-[#b3b3b3] truncate">{currentTrack.artist}</p>
          </div>
          <a
            href={`/api/stream/${currentTrack.videoId}/download`}
            download
            className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition flex items-center justify-center"
            title="Download song"
          >
            <Download className="w-5 h-5" />
          </a>
        </div>

        {/* Progress Slider */}
        <div className="w-full space-y-2 mb-6">
          <input
            type="range"
            min={0}
            max={durationSeconds > 0 ? durationSeconds : 180}
            value={Math.floor(progressSeconds)}
            onChange={(e) => seek(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-[#4d4d4d] rounded-lg appearance-none cursor-pointer accent-white hover:accent-spotify-green transition"
          />
          <div className="flex justify-between text-xs text-[#b3b3b3] font-medium">
            <span>{formatTime(progressSeconds)}</span>
            <span>{formatTime(durationSeconds || 180)}</span>
          </div>
        </div>

        {/* Big Controls */}
        <div className="flex items-center justify-between w-full mb-8">
          <button onClick={prevTrack} className="p-3 text-[#b3b3b3] hover:text-white transition">
            <SkipBack className="w-8 h-8" />
          </button>
          <button
            onClick={togglePlay}
            className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition shadow-2xl"
          >
            {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
          </button>
          <button onClick={nextTrack} className="p-3 text-[#b3b3b3] hover:text-white transition">
            <SkipForward className="w-8 h-8" />
          </button>
        </div>

        {/* Volume slider in modal */}
        <div className="w-full flex items-center space-x-3 text-[#b3b3b3]">
          <Volume2 className="w-5 h-5" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-full h-1 bg-[#4d4d4d] rounded-lg appearance-none cursor-pointer accent-white hover:accent-spotify-green transition"
          />
        </div>
      </div>
    </div>
  );
};
