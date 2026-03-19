import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE, useUser } from '../App';
import RankBadge from './RankBadge';

function Leaderboard() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadLeaderboard();
  }, []);

  async function loadLeaderboard() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/users/leaderboard`);
      if (!res.ok) throw new Error('Failed to fetch leaderboard');
      const data = await res.json();
      setEntries(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const crownColors = ['#f5c518', '#c0c0c0', '#cd7f32'];
  const crownLabels = ['👑', '🥈', '🥉'];

  return (
    <div className="h-full flex flex-col bg-nexus-bg overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-nexus-border bg-nexus-panel shrink-0 flex items-center justify-between">
        <div>
          <div className="text-nexus-muted font-game text-xs tracking-widest uppercase mb-1">Global Rankings</div>
          <div className="text-nexus-accent font-game font-bold text-lg tracking-wider">LEADERBOARD</div>
        </div>
        <button
          onClick={loadLeaderboard}
          className="px-3 py-1.5 border border-nexus-border text-nexus-muted hover:border-nexus-accent/50 hover:text-nexus-text font-game text-xs tracking-wider rounded transition-all"
        >
          REFRESH
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading && (
          <div className="flex items-center justify-center h-32">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 bg-nexus-accent rounded-full pulse-glow"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="text-center py-12">
            <div className="text-nexus-danger font-game text-sm mb-2">{error}</div>
            <button onClick={loadLeaderboard} className="text-nexus-accent font-game text-xs underline">
              Retry
            </button>
          </div>
        )}

        {!loading && !error && entries.length === 0 && (
          <div className="text-center py-12 text-nexus-muted font-game text-sm">
            No operatives ranked yet.
          </div>
        )}

        {!loading && !error && entries.length > 0 && (
          <div className="max-w-2xl mx-auto space-y-2">
            {entries.map((entry, idx) => {
              const pos = idx + 1;
              const isCurrentUser = entry.id === user?.id;
              const isTop3 = pos <= 3;

              return (
                <div
                  key={entry.id}
                  onClick={() => navigate(`/profile/${entry.id}`)}
                  className={`flex items-center gap-4 px-4 py-3 rounded border transition-all cursor-pointer ${
                    isCurrentUser
                      ? 'border-nexus-accent bg-nexus-accent/8 glow-accent'
                      : 'border-nexus-border bg-nexus-panel/50 hover:border-nexus-accent/40 hover:bg-nexus-panel'
                  }`}
                  style={isCurrentUser ? { background: 'rgba(0,212,255,0.05)' } : {}}
                  title={`View ${entry.username}'s profile`}
                >
                  {/* Position */}
                  <div className="w-10 shrink-0 text-center">
                    {isTop3 ? (
                      <span className="text-xl">{crownLabels[idx]}</span>
                    ) : (
                      <span
                        className="font-game font-bold text-base"
                        style={{ color: isCurrentUser ? '#00d4ff' : '#6b7fa3' }}
                      >
                        #{pos}
                      </span>
                    )}
                  </div>

                  {/* Username */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-game font-bold text-sm truncate ${
                          isCurrentUser ? 'text-nexus-accent' : 'text-nexus-text'
                        }`}
                      >
                        {entry.username}
                        {isCurrentUser && (
                          <span className="ml-2 text-nexus-muted font-game text-xs font-normal">(you)</span>
                        )}
                      </span>
                    </div>
                    <div className="text-nexus-muted font-game text-xs mt-0.5">
                      Weekly: +{(entry.weeklyXP || 0).toLocaleString()} XP
                    </div>
                  </div>

                  {/* Rank badge */}
                  <div className="shrink-0">
                    <RankBadge rank={entry.rank} size="sm" />
                  </div>

                  {/* Total XP */}
                  <div className="shrink-0 text-right">
                    <div
                      className="font-game font-bold text-base"
                      style={{ color: isTop3 ? crownColors[idx] : isCurrentUser ? '#00d4ff' : '#e0e6f0' }}
                    >
                      {(entry.xp || 0).toLocaleString()}
                    </div>
                    <div className="text-nexus-muted font-game text-xs">XP</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default Leaderboard;
