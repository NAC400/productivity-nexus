import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE, useUser } from '../App';
import RankBadge from './RankBadge';

const AVATAR_KEY = 'nexus_avatar';
const POLL_MS = 3000;

function formatTime(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function FriendChat() {
  const { user } = useUser();
  const navigate = useNavigate();

  const [friends, setFriends] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [unreadMap, setUnreadMap] = useState({}); // friendId → count
  const [loading, setLoading] = useState(true);

  const messagesEndRef = useRef(null);
  const pollRef = useRef(null);

  // ── Load friends ────────────────────────────────────────────────────────────
  const loadFriends = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`${API_BASE}/friends?user_id=${user.id}`);
      if (!res.ok) return;
      const data = await res.json();
      setFriends(data);

      // Fetch per-friend unread counts
      const counts = {};
      await Promise.all(
        data.map(async (f) => {
          try {
            const r = await fetch(`${API_BASE}/messages/unread-count?user_id=${user.id}&from_id=${f.id}`);
            if (r.ok) {
              const d = await r.json();
              counts[f.id] = d.count || 0;
            }
          } catch (_) {}
        })
      );
      setUnreadMap(counts);
    } catch (_) {
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { loadFriends(); }, [loadFriends]);

  // ── Load / poll messages when a friend is selected ────────────────────────
  const loadMessages = useCallback(async () => {
    if (!user?.id || !selectedFriend) return;
    try {
      const res = await fetch(
        `${API_BASE}/messages/conversation/${selectedFriend.id}?user_id=${user.id}`
      );
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data);
      // Clear unread badge for this friend
      setUnreadMap((prev) => ({ ...prev, [selectedFriend.id]: 0 }));
    } catch (_) {}
  }, [user?.id, selectedFriend]);

  useEffect(() => {
    if (!selectedFriend) return;
    loadMessages();
    pollRef.current = setInterval(loadMessages, POLL_MS);
    return () => clearInterval(pollRef.current);
  }, [selectedFriend, loadMessages]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Send message ─────────────────────────────────────────────────────────
  async function sendMessage() {
    const text = input.trim();
    if (!text || !selectedFriend || sending) return;
    setSending(true);
    setInput('');
    try {
      await fetch(`${API_BASE}/messages/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender_id: user.id, receiver_id: selectedFriend.id, content: text }),
      });
      await loadMessages();
    } catch (_) {
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  // ── Empty state ───────────────────────────────────────────────────────────
  if (!loading && friends.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-8 bg-nexus-bg">
        <div className="text-4xl mb-4">👥</div>
        <div className="text-nexus-text font-game font-bold text-lg tracking-wider mb-2">
          No Friends Yet
        </div>
        <div className="text-nexus-muted font-game text-sm max-w-xs">
          Add friends from the Leaderboard to start chatting. Click any player's name to view their profile and send a request.
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          className="mt-6 px-4 py-2 border border-nexus-accent text-nexus-accent font-game text-xs tracking-widest rounded hover:bg-nexus-accent/10 transition-all"
        >
          GO TO LEADERBOARD
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex bg-nexus-bg overflow-hidden">
      {/* ── Friends list (left column) ─────────────────────────────────────── */}
      <div className="w-72 shrink-0 border-r border-nexus-border flex flex-col bg-nexus-panel">
        {/* Header */}
        <div className="px-4 py-3 border-b border-nexus-border">
          <div className="text-nexus-muted font-game text-xs tracking-widest uppercase">
            Online • {friends.length} Friend{friends.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Friend rows */}
        <div className="flex-1 overflow-y-auto py-2">
          {loading ? (
            <div className="flex justify-center pt-6">
              <div className="flex gap-1">
                {[0,1,2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 bg-nexus-accent rounded-full pulse-glow"
                    style={{ animationDelay: `${i * 0.2}s` }} />
                ))}
              </div>
            </div>
          ) : (
            friends.map((f) => {
              const isSelected = selectedFriend?.id === f.id;
              const unread = unreadMap[f.id] || 0;
              return (
                <button
                  key={f.id}
                  onClick={() => setSelectedFriend(f)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all border-l-2 ${
                    isSelected
                      ? 'border-nexus-accent bg-nexus-accent/8'
                      : 'border-transparent hover:bg-nexus-bg/60 hover:border-nexus-accent/30'
                  }`}
                  style={isSelected ? { background: 'rgba(0,212,255,0.05)' } : {}}
                >
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded border border-nexus-border bg-nexus-bg flex items-center justify-center text-xl shrink-0">
                    🧠
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className={`font-game font-bold text-sm truncate ${isSelected ? 'text-nexus-accent' : 'text-nexus-text'}`}>
                      {f.username}
                    </div>
                    <div className="text-nexus-muted font-game text-xs">{f.rank}</div>
                  </div>
                  {/* Unread badge */}
                  {unread > 0 && (
                    <div className="w-5 h-5 rounded-full bg-nexus-danger flex items-center justify-center shrink-0">
                      <span className="text-white font-game font-bold text-xs">{unread > 9 ? '9+' : unread}</span>
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Conversation panel (right) ──────────────────────────────────────── */}
      {!selectedFriend ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
          <div className="text-4xl mb-3">💬</div>
          <div className="text-nexus-muted font-game text-sm tracking-wide">
            Select a friend to start chatting
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Chat header */}
          <div className="px-5 py-3 border-b border-nexus-border bg-nexus-panel shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded border border-nexus-border bg-nexus-bg flex items-center justify-center text-xl">
                🧠
              </div>
              <div>
                <div className="text-nexus-text font-game font-bold text-sm tracking-wider">
                  {selectedFriend.username}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <RankBadge rank={selectedFriend.rank} size="xs" />
                </div>
              </div>
            </div>
            <button
              onClick={() => navigate(`/profile/${selectedFriend.id}`)}
              className="px-3 py-1.5 border border-nexus-border text-nexus-muted hover:border-nexus-accent/50 hover:text-nexus-accent font-game text-xs tracking-wider rounded transition-all"
            >
              VIEW PROFILE
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-12 text-nexus-muted font-game text-sm">
                No messages yet. Say hello!
              </div>
            )}
            {messages.map((msg) => {
              const isMe = msg.sender_id === user.id;
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs lg:max-w-md ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                    <div
                      className={`px-4 py-2.5 rounded-lg border font-game text-sm leading-relaxed ${
                        isMe
                          ? 'border-nexus-accent/40 bg-nexus-accent/8 text-nexus-text'
                          : 'border-nexus-border bg-nexus-panel text-nexus-text'
                      }`}
                      style={isMe ? { background: 'rgba(0,212,255,0.06)' } : {}}
                    >
                      {msg.content}
                    </div>
                    <div className="text-nexus-muted/50 font-mono text-xs mt-1 px-1">
                      {formatTime(msg.sent_at)}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input bar */}
          <div className="px-5 py-3 border-t border-nexus-border bg-nexus-panel shrink-0">
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Message ${selectedFriend.username}...`}
                maxLength={500}
                className="flex-1 bg-nexus-bg border border-nexus-border rounded px-4 py-2.5 text-nexus-text font-game text-sm placeholder-nexus-muted/50 focus:outline-none focus:border-nexus-accent/60 transition-colors"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || sending}
                className="px-4 py-2.5 border border-nexus-accent text-nexus-accent font-game text-xs tracking-widest rounded hover:bg-nexus-accent/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                SEND
              </button>
            </div>
            <div className="text-nexus-muted/40 font-game text-xs mt-1.5 pl-1">
              Press Enter to send
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
