import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore, usePlayerStore } from './store';
import { Sidebar } from './components/Sidebar';
import { PlayerBar } from './components/PlayerBar';
import { AudioEngine } from './components/AudioEngine';
import { NowPlayingModal } from './components/NowPlayingModal';
import { QueueDrawer } from './components/QueueDrawer';
import { HomePage } from './pages/HomePage';
import { SearchPage } from './pages/SearchPage';
import { PlaylistPage } from './pages/PlaylistPage';
import { FavoritesPage } from './pages/FavoritesPage';
import { StatsPage } from './pages/StatsPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';
import { Playlist } from './types';

export const App: React.FC = () => {
  const { token, user } = useAuthStore();
  const { initSocket } = usePlayerStore();

  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isNowPlayingOpen, setIsNowPlayingOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  // Socket initialization on login
  useEffect(() => {
    if (token) {
      initSocket(token);
      fetchPlaylists();
    }
  }, [token]);

  const handleApiError = (res: Response) => {
    if (res.status === 401) {
      useAuthStore.getState().logout();
    }
  };

  const fetchPlaylists = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/library/playlists', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPlaylists(data.playlists || []);
      } else if (res.status === 401) {
        useAuthStore.getState().logout();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim() || !token) return;

    try {
      const res = await fetch('/api/library/playlists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newPlaylistName.trim() }),
      });
      if (res.ok) {
        setNewPlaylistName('');
        setIsCreateModalOpen(false);
        fetchPlaylists();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!token) {
    return <LoginPage />;
  }

  return (
    <BrowserRouter>
      <div className="flex h-screen bg-black overflow-hidden select-none">
        {/* Persistent Audio Engine & Web Audio Graph */}
        <AudioEngine />

        {/* Navigation Sidebar */}
        <Sidebar
          playlists={playlists}
          onCreatePlaylist={() => setIsCreateModalOpen(true)}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-b from-[#202020] to-[#121212] relative">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/search" element={<SearchPage playlists={playlists} />} />
            <Route path="/favorites" element={<FavoritesPage />} />
            <Route path="/library" element={<FavoritesPage />} />
            <Route path="/playlist/:id" element={<PlaylistPage onPlaylistUpdated={fetchPlaylists} />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        {/* Persistent Player Bar */}
        <PlayerBar
          onOpenQueue={() => setIsQueueOpen(!isQueueOpen)}
          onOpenNowPlaying={() => setIsNowPlayingOpen(true)}
        />

        {/* Modals & Overlays */}
        <QueueDrawer isOpen={isQueueOpen} onClose={() => setIsQueueOpen(false)} />
        <NowPlayingModal isOpen={isNowPlayingOpen} onClose={() => setIsNowPlayingOpen(false)} />

        {/* Create Playlist Modal */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <form
              onSubmit={handleCreatePlaylist}
              className="bg-[#282828] p-6 rounded-xl w-full max-w-sm border border-[#3e3e3e] space-y-4"
            >
              <h3 className="text-lg font-bold">Create new playlist</h3>
              <input
                type="text"
                placeholder="Playlist name"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                className="w-full bg-[#181818] border border-[#3e3e3e] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-spotify-green"
                autoFocus
                required
              />
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 py-2 bg-transparent hover:bg-[#333] border border-[#4d4d4d] rounded-full text-sm font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-spotify-green text-black rounded-full text-sm font-bold hover:bg-[#1ed760] transition"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </BrowserRouter>
  );
};
