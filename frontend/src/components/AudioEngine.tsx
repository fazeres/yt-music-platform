import React, { useEffect, useRef } from 'react';
import { usePlayerStore, useAuthStore } from '../store';

export const VisualizerCanvas: React.FC<{ analyser: AnalyserNode | null }> = ({ analyser }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !analyser) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animId = requestAnimationFrame(render);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / 16) - 2;
      let barHeight;
      let x = 0;

      for (let i = 0; i < 16; i++) {
        // Sample frequencies
        const index = Math.floor((i / 16) * (bufferLength / 2));
        barHeight = (dataArray[index] / 255) * canvas.height;

        ctx.fillStyle = '#1DB954';
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 2;
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [analyser]);

  return <canvas ref={canvasRef} width={64} height={24} className="rounded bg-black/40" />;
};

export const AudioEngine: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    volume,
    crossfadeDuration,
    seek,
    nextTrack,
    activeDeviceId,
    setProgress,
  } = usePlayerStore();
  const user = useAuthStore((s) => s.user);

  const audioPrimaryRef = useRef<HTMLAudioElement | null>(null);
  const audioSecondaryRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const isLocalActiveDevice = user && activeDeviceId === user.sessionId;

  // Initialize Web Audio API graph
  useEffect(() => {
    if (!audioPrimaryRef.current) return;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;

      const sourcePrimary = ctx.createMediaElementSource(audioPrimaryRef.current);
      sourcePrimary.connect(analyser);
      analyser.connect(ctx.destination);

      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
    } catch (e) {
      console.warn('Web Audio API already connected or not supported:', e);
    }
  }, []);

  // Update audio element sources and playback
  useEffect(() => {
    const audio = audioPrimaryRef.current;
    if (!audio) return;

    if (!isLocalActiveDevice) {
      audio.pause();
      return;
    }

    if (currentTrack) {
      const streamUrl = `/api/stream/${currentTrack.videoId}`;
      if (!audio.src.includes(currentTrack.videoId)) {
        audio.src = streamUrl;
        audio.load();
      }

      if (isPlaying) {
        if (audioCtxRef.current?.state === 'suspended') {
          audioCtxRef.current.resume();
        }
        audio.play().catch(() => {
          // If browser blocked autoplay or stream is still buffering
          const retryPlay = () => {
            if (usePlayerStore.getState().isPlaying) {
              audio.play().catch(() => {});
            }
          };
          audio.addEventListener('canplay', retryPlay, { once: true });
          setTimeout(retryPlay, 1000);
          setTimeout(retryPlay, 3000);
        });
      } else {
        audio.pause();
      }
    } else {
      audio.pause();
    }
  }, [currentTrack, isPlaying, isLocalActiveDevice]);

  // Volume handling
  useEffect(() => {
    if (audioPrimaryRef.current) {
      audioPrimaryRef.current.volume = volume;
    }
  }, [volume]);

  // Time update and crossfade trigger
  const handleTimeUpdate = () => {
    const audio = audioPrimaryRef.current;
    if (!audio) return;

    const current = audio.currentTime;
    const duration = audio.duration || 0;

    setProgress(current, duration);

    // Trigger crossfade / next song near end
    if (duration > 0 && crossfadeDuration > 0 && duration - current <= crossfadeDuration) {
      const remaining = duration - current;
      const fadeRatio = Math.max(0, remaining / crossfadeDuration);
      audio.volume = volume * fadeRatio;
    }
  };

  const handleEnded = () => {
    nextTrack();
  };

  return (
    <>
      <audio
        ref={audioPrimaryRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        preload="auto"
        crossOrigin="anonymous"
      />
      <audio
        ref={audioSecondaryRef}
        preload="auto"
        crossOrigin="anonymous"
      />
    </>
  );
};
