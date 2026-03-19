import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../App';
import { useSettings } from '../hooks/useSettings';
import RankBadge from './RankBadge';

const AVATAR_KEY = 'nexus_avatar';

function TitleBar() {
  const { user, logoutUser } = useUser();
  const navigate = useNavigate();
  const { play } = useSettings();
  const [avatar, setAvatar] = useState(() => localStorage.getItem(AVATAR_KEY) || '🧠');

  // Sync avatar when localStorage changes (e.g. profile page updates it)
  useEffect(() => {
    function onStorage(e) {
      if (e.key === AVATAR_KEY) {
        setAvatar(localStorage.getItem(AVATAR_KEY) || '🧠');
      }
    }
    window.addEventListener('storage', onStorage);
    // Also poll briefly after mount in case same-tab update happened
    const id = setInterval(() => {
      const stored = localStorage.getItem(AVATAR_KEY) || '🧠';
      setAvatar((prev) => (prev !== stored ? stored : prev));
    }, 1000);
    return () => {
      window.removeEventListener('storage', onStorage);
      clearInterval(id);
    };
  }, []);

  function handleMinimize() {
    if (window.electronAPI) window.electronAPI.minimize();
  }
  function handleMaximize() {
    if (window.electronAPI) window.electronAPI.maximize();
  }
  function handleClose() {
    if (window.electronAPI) window.electronAPI.close();
  }
  function handleSignOut() {
    play('click');
    logoutUser();
  }
  function handleSettings() {
    play('click');
    navigate('/settings');
  }
  function handleProfile() {
    play('click');
    navigate('/profile');
  }

  return (
    <div
      className="flex items-center justify-between px-4 h-10 bg-nexus-panel border-b border-nexus-border select-none shrink-0"
      style={{ WebkitAppRegion: 'drag' }}
    >
      {/* Left: Logo */}
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
            <polygon
              points="12,2 22,7 22,17 12,22 2,17 2,7"
              stroke="#00d4ff"
              strokeWidth="1.5"
              fill="rgba(0,212,255,0.1)"
            />
            <polygon
              points="12,6 18,9.5 18,14.5 12,18 6,14.5 6,9.5"
              stroke="#00d4ff"
              strokeWidth="1"
              fill="rgba(0,212,255,0.15)"
            />
            <circle cx="12" cy="12" r="2" fill="#00d4ff" />
          </svg>
        </div>
        <span className="text-nexus-accent font-game font-bold tracking-widest text-sm uppercase">
          Productivity Nexus
        </span>
      </div>

      {/* Center: User info + nav icons */}
      <div
        className="flex items-center gap-2"
        style={{ WebkitAppRegion: 'no-drag' }}
      >
        {user && (
          <>
            {/* Avatar */}
            <span className="text-base leading-none">{avatar}</span>
            <span className="text-nexus-muted font-game text-sm">{user.username}</span>
            <RankBadge rank={user.rank} size="sm" />
            <span className="text-nexus-muted font-game text-xs">
              {user.xp?.toLocaleString()} XP
            </span>

            {/* Separator */}
            <div className="w-px h-4 bg-nexus-border mx-1" />

            {/* Profile icon */}
            <button
              onClick={handleProfile}
              title="Profile"
              className="w-7 h-7 flex items-center justify-center text-nexus-muted hover:text-nexus-accent transition-colors rounded hover:bg-nexus-accent/10"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="8" r="4" />
                <path strokeLinecap="round" d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
              </svg>
            </button>

            {/* Settings gear icon */}
            <button
              onClick={handleSettings}
              title="Settings"
              className="w-7 h-7 flex items-center justify-center text-nexus-muted hover:text-nexus-accent transition-colors rounded hover:bg-nexus-accent/10"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="3" />
                <path
                  strokeLinecap="round"
                  d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
                />
              </svg>
            </button>

            {/* Sign out */}
            <button
              onClick={handleSignOut}
              title="Sign Out"
              className="w-7 h-7 flex items-center justify-center text-nexus-muted hover:text-nexus-danger transition-colors rounded hover:bg-nexus-danger/10"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
              </svg>
            </button>
          </>
        )}
        {!user && (
          <span className="text-nexus-muted font-game text-sm tracking-wider">
            NOT LOGGED IN
          </span>
        )}
      </div>

      {/* Right: Window controls */}
      <div
        className="flex items-center gap-1"
        style={{ WebkitAppRegion: 'no-drag' }}
      >
        {/* Minimize */}
        <button
          onClick={handleMinimize}
          className="group relative w-7 h-7 flex items-center justify-center hover:bg-nexus-border transition-colors rounded"
          title="Minimize"
        >
          <svg
            viewBox="0 0 24 24"
            className="w-3.5 h-3.5 text-nexus-muted group-hover:text-nexus-gold transition-colors"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M5 12h14" />
          </svg>
        </button>

        {/* Maximize */}
        <button
          onClick={handleMaximize}
          className="group relative w-7 h-7 flex items-center justify-center hover:bg-nexus-border transition-colors rounded"
          title="Maximize"
        >
          <svg
            viewBox="0 0 24 24"
            className="w-3.5 h-3.5 text-nexus-muted group-hover:text-nexus-accent transition-colors"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="4" y="4" width="16" height="16" rx="1" />
          </svg>
        </button>

        {/* Close */}
        <button
          onClick={handleClose}
          className="group relative w-7 h-7 flex items-center justify-center hover:bg-nexus-danger/20 transition-colors rounded"
          title="Close"
        >
          <svg
            viewBox="0 0 24 24"
            className="w-3.5 h-3.5 text-nexus-muted group-hover:text-nexus-danger transition-colors"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default TitleBar;
