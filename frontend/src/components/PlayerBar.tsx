import React, { useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Laptop,
  ListMusic,
  Maximize2,
  Sparkles,
} from 'lucide-react';
import { usePlayerStore, useAuthStore } from '../store';
import { Track } from '../types';

export const PlayerBar: React.FC<{
  onOpenQueue: () => void;
  onOpenNowPlaying: () => void;
}> = ({ onOpenQueue, onOpenNowPlaying }) => {
  const {
    currentTrack,
    isPlaying,
    progressSeconds,
    durationSeconds,
    volume,
    isResolving,
    activeDeviceId,
    activeDeviceName,
    togglePlay,
    seek,
    setVolume,
    nextTrack,
    prevTrack,
    transferPlaybackToThisDevice,
  } = usePlayerStore();
  const user = useAuthStore((s) => s.user);

  const isThisDeviceActive = user && activeDeviceId === user.sessionId;

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!currentTrack) {
    return null;
  }

  return (
    <div className="h-24 bg-[#181818] border-t border-[#282828] px-4 flex items-center justify-between fixed bottom-0 left-0 right-0 z-50">
      {/* Left: Track Info */}
      <div className="flex items-center space-x-3 w-1/4 min-w-[180px]">
        <img
          src={currentTrack.thumbnailUrl || `https://i.ytimg.com/vi/${currentTrack.videoId}/hqdefault.jpg`}
          alt={currentTrack.title}
          className="w-14 h-14 rounded object-cover cursor-pointer hover:opacity-80 transition"
          onClick={onOpenNowPlaying}
        />
        <div className="truncate cursor-pointer" onClick={onOpenNowPlaying}>
          <div className="text-white text-sm font-medium truncate hover:underline">
            {currentTrack.title}
          </div>
          <div className="text-[#b3b3b3] text-xs truncate hover:underline">
            {currentTrack.artist}
          </div>
          {isResolving && (
            <div className="text-yellow-400 text-[10px] flex items-center space-x-1 mt-0.5">
              <Sparkles className="w-3 h-3 animate-spin" />
              <span>Caching audio...</span>
            </div>
          )}
        </div>
      </div>

      {/* Center: Controls & Progress */}
      <div className="flex flex-col items-center w-2/4 max-w-xl">
        <div className="flex items-center space-x-6 mb-1">
          <button
            onClick={prevTrack}
            className="text-[#b3b3b3] hover:text-white transition"
          >
            <SkipBack className="w-5 h-5" />
          </button>
          <button
            onClick={togglePlay}
            className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition"
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </button>
          <button
            onClick={nextTrack}
            className="text-[#b3b3b3] hover:text-white transition"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full flex items-center space-x-2 text-xs text-[#b3b3b3]">
          <span>{formatTime(progressSeconds)}</span>
          <input
            type="range"
            min={0}
            max={durationSeconds > 0 ? durationSeconds : 180}
            value={Math.floor(progressSeconds)}
            onChange={(e) => seek(parseFloat(e.target.value))}
            className="w-full h-1 bg-[#4d4d4d] rounded-lg appearance-none cursor-pointer accent-white hover:accent-spotify-green transition"
          />
          <span>{formatTime(durationSeconds || 180)}</span>
        </div>
      </div>

      {/* Right: Device & Volume Controls */}
      <div className="flex items-center justify-end space-x-4 w-1/4 min-w-[200px]">
        {/* Multi-device playback status indicator */}
        <div className="flex items-center space-x-1.5 text-xs">
          <Laptop className={`w-4 h-4 ${isThisDeviceActive ? 'text-spotify-green' : 'text-[#b3b3b3]'}`} />
          <span className="text-[#b3b3b3] hidden md:inline truncate max-w-[100px]">
            {isThisDeviceActive ? 'This device' : activeDeviceName || 'Remote device'}
          </span>
          {!isThisDeviceActive && (
            <button
              onClick={transferPlaybackToThisDevice}
              className="text-xs bg-spotify-green/20 text-spotify-green px-2 py-0.5 rounded hover:bg-spotify-green hover:text-black font-semibold transition"
            >
              Play here
            </button>
          )}
        </div>

        <button onClick={onOpenQueue} className="text-[#b3b3b3] hover:text-white transition">
          <ListMusic className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2">
          {volume === 0 ? (
            <VolumeX className="w-5 h-5 text-[#b3b3b3]" />
          ) : (
            <Volume2 className="w-5 h-5 text-[#b3b3b3]" />
          )}
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-20 h-1 bg-[#4d4d4d] rounded-lg appearance-none cursor-pointer accent-white hover:accent-spotify-green transition"
          />
        </div>

        <button onClick={onOpenNowPlaying} className="text-[#b3b3b3] hover:text-white transition">
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
