import React, { useState } from 'react';
import { useAuthStore } from '../store';
import { Music2, Sparkles } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('user@example.com');
  const [password, setPassword] = useState('password123');
  const [deviceName, setDeviceName] = useState(
    navigator.userAgent.includes('Mobile') ? 'Mobile Phone' : 'Laptop / Desktop'
  );
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const setAuth = useAuthStore((s) => s.setAuth);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, deviceName }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      setAuth(data.token, data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <div className="bg-[#181818] p-8 rounded-2xl border border-[#282828] w-full max-w-md space-y-6 shadow-2xl">
        <div className="flex flex-col items-center space-y-2">
          <div className="w-12 h-12 bg-spotify-green rounded-full flex items-center justify-center text-black font-bold shadow-lg">
            <Music2 className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-white">YT Music Streamer</h1>
          <p className="text-xs text-[#b3b3b3]">Production-grade self-hosted music platform</p>
        </div>

        {error && (
          <div className="p-3 bg-red-500/20 border border-red-500/50 rounded text-red-300 text-xs text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#b3b3b3] uppercase mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#242424] border border-[#3e3e3e] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-spotify-green transition"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#b3b3b3] uppercase mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#242424] border border-[#3e3e3e] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-spotify-green transition"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#b3b3b3] uppercase mb-1">Device Name</label>
            <input
              type="text"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              className="w-full bg-[#242424] border border-[#3e3e3e] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-spotify-green transition"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-spotify-green hover:bg-[#1ed760] text-black font-bold rounded-full transition duration-200 mt-2 shadow-lg disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Sign In'}
          </button>
        </form>

        <div className="text-[11px] text-center text-[#777]">
          Seeded default: <span className="text-[#aaa]">user@example.com</span> / <span className="text-[#aaa]">password123</span>
        </div>
      </div>
    </div>
  );
};
