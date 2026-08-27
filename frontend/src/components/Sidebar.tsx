import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  Search,
  Library,
  BarChart2,
  Settings,
  PlusSquare,
  Heart,
  LogOut,
  Music2,
} from 'lucide-react';
import { useAuthStore } from '../store';
import { Playlist } from '../types';

export const Sidebar: React.FC<{
  playlists: Playlist[];
  onCreatePlaylist: () => void;
}> = ({ playlists, onCreatePlaylist }) => {
  const { user, logout } = useAuthStore();

  const navItems = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/search', label: 'Search', icon: Search },
    { to: '/library', label: 'Your Library', icon: Library },
    { to: '/stats', label: 'Stats / Year Review', icon: BarChart2 },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-black flex flex-col h-full p-4 border-r border-[#282828] select-none">
      {/* Brand Header */}
      <div className="flex items-center space-x-3 px-2 mb-8">
        <div className="w-9 h-9 bg-spotify-green rounded-full flex items-center justify-center text-black font-bold">
          <Music2 className="w-5 h-5" />
        </div>
        <span className="font-bold text-lg tracking-tight">YT Music</span>
      </div>

      {/* Main Navigation */}
      <nav className="space-y-2 mb-6">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center space-x-4 px-3 py-2.5 rounded-md font-medium text-sm transition ${
                  isActive ? 'bg-[#282828] text-white' : 'text-[#b3b3b3] hover:text-white'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Playlists & Quick Actions */}
      <div className="pt-4 border-t border-[#282828] flex-1 overflow-y-auto">
        <div className="flex items-center justify-between px-3 mb-3 text-xs font-bold text-[#b3b3b3] uppercase tracking-wider">
          <span>Playlists</span>
          <button
            onClick={onCreatePlaylist}
            className="hover:text-white transition"
            title="Create Playlist"
          >
            <PlusSquare className="w-4 h-4" />
          </button>
        </div>

        <NavLink
          to="/favorites"
          className={({ isActive }) =>
            `flex items-center space-x-3 px-3 py-2 rounded text-sm transition ${
              isActive ? 'bg-[#282828] text-white font-medium' : 'text-[#b3b3b3] hover:text-white'
            }`
          }
        >
          <div className="w-6 h-6 rounded bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
            <Heart className="w-3.5 h-3.5 fill-white text-white" />
          </div>
          <span>Liked Songs</span>
        </NavLink>

        <div className="mt-3 space-y-1">
          {playlists.map((pl) => (
            <NavLink
              key={pl.id}
              to={`/playlist/${pl.id}`}
              className={({ isActive }) =>
                `block px-3 py-1.5 rounded text-sm truncate transition ${
                  isActive ? 'bg-[#282828] text-white font-medium' : 'text-[#b3b3b3] hover:text-white'
                }`
              }
            >
              {pl.name}
            </NavLink>
          ))}
        </div>
      </div>

      {/* User Footer */}
      <div className="pt-4 border-t border-[#282828] flex items-center justify-between px-2 text-xs text-[#b3b3b3]">
        <div className="truncate max-w-[140px]">
          <div className="font-semibold text-white truncate">{user?.deviceName || 'Device'}</div>
          <div className="truncate">{user?.email}</div>
        </div>
        <button
          onClick={logout}
          className="p-1.5 hover:text-white transition rounded hover:bg-[#282828]"
          title="Logout"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
