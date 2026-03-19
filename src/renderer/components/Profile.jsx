import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser } from '../App';
import { API_BASE } from '../App';
import RankBadge from './RankBadge';
import { useSettings } from '../hooks/useSettings';

const AVATARS = ['🧠', '🔬', '📚', '🎓', '⚡', '🏆', '🌟', '🔭', '💡', '🎯', '🚀', '🧬'];
const AVATAR_KEY = 'nexus_avatar';

function SectionHeader({ title }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-nexus-accent font-game font-bold text-xs tracking-widest uppercase">
        {title}
      </span>
      <div className="flex-1 h-px bg-nexus-accent/20" />
    </div>
  );
}

function Profile() {
  const { user: currentUser } = useUser();
  const { play } = useSettings();
  const { userId } = useParams(); // present when viewing someone else's profile
  const navigate = useNavigate();

  // Are we viewing our own profile or someone else's?
  const isOwnProfile = !userId || userId === currentUser?.id;
  const targetUserId = isOwnProfile ? currentUser?.id : userId;

  const [profileUser, setProfileUser] = useState(isOwnProfile ? currentUser : null);
  const [stats, setStats] = useState(null);
  const [selectedAvatar, setSelectedAvatar] = useState(
    () => localStorage.getItem(AVATAR_KEY) || '🧠'
  );

  useEffect(() => {
    if (!targetUserId) return;

    // Load stats
    fetch(`${API_BASE}/users/${targetUserId}/stats`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setStats(data); })
      .catch(() => {});

    // If viewing another user, fetch their basic info
    if (!isOwnProfile) {
      fetch(`${API_BASE}/users/${targetUserId}`)
        .then((r) => r.ok ? r.json() : null)
        .then((data) => { if (data) setProfileUser(data); })
        .catch(() => {});
    }
  }, [targetUserId, isOwnProfile]);

  function handleAvatarSelect(avatar) {
    if (!isOwnProfile) return;
    play('click');
    setSelectedAvatar(avatar);
    localStorage.setItem(AVATAR_KEY, avatar);
  }

  const displayUser = isOwnProfile ? currentUser : profileUser;
  const joinDate = displayUser?.created_at
    ? new Date(displayUser.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '—';

  // For other users, show a default avatar (we don't store their emoji choice)
  const displayAvatar = isOwnProfile ? selectedAvatar : '🧠';

  if (!isOwnProfile && !profileUser) {
    return (
      <div className="h-full flex items-center justify-center bg-nexus-bg">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-2 h-2 bg-nexus-accent rounded-full pulse-glow"
              style={{ animationDelay: `${i * 0.2}s` }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-nexus-bg">
      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Page header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="text-nexus-muted font-game text-xs tracking-widest uppercase mb-1">
              {isOwnProfile ? 'Operative File' : 'Operative Profile'}
            </div>
            <div className="text-nexus-accent font-game font-bold text-2xl tracking-widest uppercase">
              {isOwnProfile ? 'Profile' : (displayUser?.username || 'Profile')}
            </div>
          </div>
          {!isOwnProfile && (
            <button
              onClick={() => navigate(-1)}
              className="px-3 py-1.5 border border-nexus-border text-nexus-muted hover:border-nexus-accent/50 hover:text-nexus-accent font-game text-xs tracking-wider rounded transition-all"
            >
              ← BACK
            </button>
          )}
        </div>

        {/* Identity card */}
        <div className="mb-6 p-5 bg-nexus-panel border border-nexus-border rounded">
          <div className="flex items-center gap-5">
            <div
              className="w-20 h-20 rounded border-2 border-nexus-accent/50 bg-nexus-bg flex items-center justify-center text-4xl shrink-0"
              style={{ boxShadow: '0 0 20px rgba(0,212,255,0.15)' }}
            >
              {displayAvatar}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-nexus-text font-game font-bold text-xl tracking-wider mb-1">
                {displayUser?.username || '—'}
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <RankBadge rank={displayUser?.rank || 'Iron'} size="sm" />
                <span className="text-nexus-gold font-game text-sm font-bold">
                  {(stats?.xp ?? displayUser?.xp ?? 0).toLocaleString()} XP
                </span>
              </div>
              <div className="text-nexus-muted font-game text-xs mt-2">
                Joined {joinDate}
              </div>
            </div>
          </div>
        </div>

        {/* Avatar picker — own profile only */}
        {isOwnProfile && (
          <div className="mb-6 p-5 bg-nexus-panel border border-nexus-border rounded">
            <SectionHeader title="Choose Avatar" />
            <div className="grid grid-cols-6 gap-3">
              {AVATARS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleAvatarSelect(emoji)}
                  className={`w-full aspect-square rounded border text-2xl flex items-center justify-center transition-all hover:scale-110 ${
                    selectedAvatar === emoji
                      ? 'border-nexus-accent bg-nexus-accent/10'
                      : 'border-nexus-border bg-nexus-bg hover:border-nexus-accent/40'
                  }`}
                  style={selectedAvatar === emoji ? { boxShadow: '0 0 12px rgba(0,212,255,0.3)' } : {}}
                  title={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <p className="text-nexus-muted/60 font-game text-xs mt-3">
              Avatar is saved locally and shown in the app header.
            </p>
          </div>
        )}

        {/* Stats */}
        <div className="p-5 bg-nexus-panel border border-nexus-border rounded">
          <SectionHeader title="Combat Stats" />

          {stats && (
            <div className="mb-5">
              <div className="flex justify-between mb-2">
                <span className="text-nexus-muted font-game text-xs tracking-wider">XP TO NEXT RANK</span>
                <span className="text-nexus-text font-game text-xs">
                  {stats.nextRankXP ? `${stats.nextRankXP.toLocaleString()} needed` : 'MAX RANK'}
                </span>
              </div>
              <div className="h-2.5 bg-nexus-border rounded overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-nexus-accent to-nexus-accent/60 rounded transition-all duration-1000"
                  style={{ width: `${stats.progressToNext || 0}%` }}
                />
              </div>
              <div className="text-right mt-1 text-nexus-muted font-game text-xs">
                {stats.progressToNext || 0}%
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Tasks Completed', value: stats?.completedTasksCount ?? '—' },
              { label: 'Current Rank', value: displayUser?.rank || '—' },
              { label: 'Avg Grammar', value: stats ? `${stats.avgGrammarScore}/100` : '—' },
              { label: 'Avg Idea Score', value: stats ? `${stats.avgIdeaScore}/100` : '—' },
              { label: 'Avg Execution', value: stats ? `${stats.avgExecutionScore}/100` : '—' },
              { label: 'Weekly Tasks', value: stats?.weeklyTasks ?? '—' },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="p-3 border border-nexus-border rounded bg-nexus-bg/50 text-center"
              >
                <div className="text-nexus-accent font-game font-bold text-lg">{value}</div>
                <div className="text-nexus-muted font-game text-xs">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
