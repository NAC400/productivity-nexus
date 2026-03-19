import React, { useState, useEffect, useRef, useCallback } from 'react';
import { API_BASE, useUser } from '../App';
import RankBadge from './RankBadge';

function Social() {
  const { user } = useUser();
  const [friends, setFriends] = useState([]);
  const [pending, setPending] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [activeFriend, setActiveFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [msgInput, setMsgInput] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);
  const pollRef = useRef(null);

  const loadFriends = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [friendsRes, pendingRes] = await Promise.all([
        fetch(`${API_BASE}/friends?user_id=${user.id}`),
        fetch(`${API_BASE}/friends/pending?user_id=${user.id}`),
      ]);
      if (friendsRes.ok) setFriends(await friendsRes.json());
      if (pendingRes.ok) setPending(await pendingRes.json());
    } catch {
      // silent
    } finally {
      setLoadingFriends(false);
    }
  }, [user?.id]);

  const loadMessages = useCallback(async () => {
    if (!user?.id || !activeFriend) return;
    try {
      const res = await fetch(
        `${API_BASE}/messages/conversation/${activeFriend.id}?user_id=${user.id}`
      );
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch {
      // silent
    }
  }, [user?.id, activeFriend]);

  // Initial load
  useEffect(() => {
    loadFriends();
  }, [loadFriends]);

  // Poll messages every 3 seconds when chat is open
  useEffect(() => {
    if (!activeFriend) return;
    loadMessages();
    pollRef.current = setInterval(loadMessages, 3000);
    return () => clearInterval(pollRef.current);
  }, [activeFriend, loadMessages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSearch(e) {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    setSearching(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/users/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        // Exclude self
        setSearchResults(data.filter((u) => u.id !== user.id));
      }
    } catch {
      setError('Search failed.');
    } finally {
      setSearching(false);
    }
  }

  async function sendFriendRequest(addresseeId) {
    try {
      const res = await fetch(`${API_BASE}/friends/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requester_id: user.id, addressee_id: addresseeId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to send request.');
        return;
      }
      setSearchResults([]);
      setSearchQuery('');
    } catch {
      setError('Failed to send friend request.');
    }
  }

  async function acceptRequest(friendshipId) {
    try {
      await fetch(`${API_BASE}/friends/accept/${friendshipId}`, { method: 'PUT' });
      await loadFriends();
    } catch {
      setError('Failed to accept request.');
    }
  }

  async function rejectRequest(friendshipId) {
    try {
      await fetch(`${API_BASE}/friends/reject/${friendshipId}`, { method: 'PUT' });
      await loadFriends();
    } catch {
      setError('Failed to reject request.');
    }
  }

  async function unfriend(friendshipId) {
    if (!window.confirm('Remove this friend?')) return;
    try {
      await fetch(`${API_BASE}/friends/${friendshipId}`, { method: 'DELETE' });
      if (activeFriend?.friendship_id === friendshipId) {
        setActiveFriend(null);
        setMessages([]);
      }
      await loadFriends();
    } catch {
      setError('Failed to remove friend.');
    }
  }

  async function sendMessage() {
    const content = msgInput.trim();
    if (!content || !activeFriend) return;
    setSendingMsg(true);
    try {
      const res = await fetch(`${API_BASE}/messages/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_id: user.id,
          receiver_id: activeFriend.id,
          content,
        }),
      });
      if (res.ok) {
        setMsgInput('');
        await loadMessages();
      }
    } catch {
      // silent
    } finally {
      setSendingMsg(false);
    }
  }

  function handleMsgKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function formatTime(str) {
    if (!str) return '';
    try {
      return new Date(str).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }

  // Check if already friends / request sent
  function getFriendStatus(userId) {
    const isFriend = friends.some((f) => f.id === userId);
    if (isFriend) return 'friend';
    return 'none';
  }

  return (
    <div className="h-full flex overflow-hidden bg-nexus-bg">
      {/* Left panel: Friends & Search */}
      <div className="w-72 flex flex-col border-r border-nexus-border shrink-0 bg-nexus-panel">
        {/* Search bar */}
        <div className="p-3 border-b border-nexus-border shrink-0">
          <div className="text-nexus-muted font-game text-xs tracking-widest uppercase mb-2">Find Operatives</div>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setSearchResults([]); }}
              placeholder="Search username..."
              className="flex-1 bg-nexus-bg border border-nexus-border text-nexus-text font-game text-sm px-3 py-2 rounded focus:outline-none focus:border-nexus-accent transition-colors placeholder-nexus-muted/50"
            />
            <button
              type="submit"
              disabled={searching || !searchQuery.trim()}
              className="px-3 py-2 bg-nexus-accent/10 border border-nexus-accent/50 hover:bg-nexus-accent/20 text-nexus-accent font-game text-xs rounded transition-all disabled:opacity-50"
            >
              {searching ? '...' : 'GO'}
            </button>
          </form>

          {/* Search results */}
          {searchResults.length > 0 && (
            <div className="mt-2 border border-nexus-border rounded overflow-hidden">
              {searchResults.map((u) => {
                const status = getFriendStatus(u.id);
                return (
                  <div key={u.id} className="flex items-center gap-2 px-3 py-2 hover:bg-nexus-bg/50 border-b border-nexus-border/50 last:border-b-0">
                    <div className="flex-1 min-w-0">
                      <div className="text-nexus-text font-game text-xs font-bold truncate">{u.username}</div>
                      <div className="text-nexus-muted font-game text-xs">{u.rank}</div>
                    </div>
                    {status === 'friend' ? (
                      <span className="text-nexus-success font-game text-xs">Friends</span>
                    ) : (
                      <button
                        onClick={() => sendFriendRequest(u.id)}
                        className="px-2 py-1 bg-nexus-accent/10 border border-nexus-accent/50 text-nexus-accent font-game text-xs rounded hover:bg-nexus-accent/20 transition-all"
                      >
                        + ADD
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {error && (
          <div className="mx-3 mt-2 px-3 py-2 bg-nexus-danger/10 border border-nexus-danger/30 rounded text-nexus-danger font-game text-xs">
            {error}
          </div>
        )}

        {/* Pending requests */}
        {pending.length > 0 && (
          <div className="border-b border-nexus-border shrink-0">
            <div className="px-3 py-2 text-nexus-muted font-game text-xs tracking-widest uppercase flex items-center gap-2">
              PENDING
              <span className="w-4 h-4 rounded-full bg-nexus-accent text-nexus-bg font-bold text-xs flex items-center justify-center">
                {pending.length}
              </span>
            </div>
            {pending.map((req) => (
              <div key={req.friendship_id} className="px-3 py-2 border-t border-nexus-border/50 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-nexus-text font-game text-xs font-bold truncate">{req.username}</div>
                  <div className="text-nexus-muted font-game text-xs">{req.rank}</div>
                </div>
                <button
                  onClick={() => acceptRequest(req.friendship_id)}
                  className="w-6 h-6 flex items-center justify-center bg-nexus-success/10 border border-nexus-success/50 text-nexus-success rounded hover:bg-nexus-success/20 transition-all text-xs"
                  title="Accept"
                >
                  ✓
                </button>
                <button
                  onClick={() => rejectRequest(req.friendship_id)}
                  className="w-6 h-6 flex items-center justify-center bg-nexus-danger/10 border border-nexus-danger/30 text-nexus-danger rounded hover:bg-nexus-danger/20 transition-all text-xs"
                  title="Reject"
                >
                  ✗
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Friends list */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-3 py-2 text-nexus-muted font-game text-xs tracking-widest uppercase border-b border-nexus-border/50">
            Friends ({friends.length})
          </div>
          {loadingFriends ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-nexus-muted font-game text-xs">Loading...</div>
            </div>
          ) : friends.length === 0 ? (
            <div className="px-3 py-6 text-center text-nexus-muted font-game text-xs opacity-70">
              No friends yet. Search for operatives above.
            </div>
          ) : (
            friends.map((f) => (
              <div
                key={f.friendship_id}
                onClick={() => { setActiveFriend(f); setMessages([]); }}
                className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer border-b border-nexus-border/30 transition-all ${
                  activeFriend?.id === f.id
                    ? 'bg-nexus-accent/10 border-l-2 border-l-nexus-accent'
                    : 'hover:bg-nexus-bg/50'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-nexus-accent/10 border border-nexus-accent/30 flex items-center justify-center shrink-0">
                  <span className="text-nexus-accent font-game font-bold text-xs">
                    {f.username?.[0]?.toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-nexus-text font-game text-xs font-bold truncate">{f.username}</div>
                  <div className="text-nexus-muted font-game text-xs">{f.xp?.toLocaleString()} XP</div>
                </div>
                <RankBadge rank={f.rank} size="xs" />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right panel: Chat */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeFriend ? (
          <>
            {/* Chat header */}
            <div className="px-4 py-3 border-b border-nexus-border bg-nexus-panel shrink-0 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-nexus-accent/10 border border-nexus-accent/30 flex items-center justify-center">
                  <span className="text-nexus-accent font-game font-bold text-sm">
                    {activeFriend.username?.[0]?.toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="text-nexus-text font-game font-bold text-sm">{activeFriend.username}</div>
                  <div className="text-nexus-muted font-game text-xs">{activeFriend.rank} • {activeFriend.xp?.toLocaleString()} XP</div>
                </div>
              </div>
              <button
                onClick={() => unfriend(activeFriend.friendship_id)}
                className="px-3 py-1 border border-nexus-danger/30 text-nexus-danger/60 hover:border-nexus-danger hover:text-nexus-danger font-game text-xs rounded transition-all"
              >
                UNFRIEND
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-nexus-muted font-game text-sm opacity-60">
                  No messages yet. Say hello!
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.sender_id === user.id;
                  return (
                    <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-xs px-3 py-2 rounded-lg font-game text-sm leading-relaxed ${
                          isMine
                            ? 'bg-nexus-accent/15 border border-nexus-accent/30 text-nexus-text'
                            : 'bg-nexus-panel border border-nexus-border text-nexus-text'
                        }`}
                      >
                        <div>{msg.content}</div>
                        <div className="text-nexus-muted font-mono text-xs mt-1 text-right opacity-60">
                          {formatTime(msg.sent_at)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message input */}
            <div className="px-4 py-3 border-t border-nexus-border bg-nexus-panel/50 shrink-0 flex gap-3 items-end">
              <textarea
                value={msgInput}
                onChange={(e) => setMsgInput(e.target.value)}
                onKeyDown={handleMsgKeyDown}
                placeholder="Type a message... (Enter to send)"
                rows={1}
                className="flex-1 bg-nexus-bg border border-nexus-border text-nexus-text font-game text-sm px-3 py-2 rounded resize-none focus:outline-none focus:border-nexus-accent transition-colors placeholder-nexus-muted/50 leading-relaxed"
                style={{ maxHeight: '80px' }}
              />
              <button
                onClick={sendMessage}
                disabled={sendingMsg || !msgInput.trim()}
                className="px-4 py-2 bg-nexus-accent/10 border border-nexus-accent text-nexus-accent hover:bg-nexus-accent/20 font-game text-sm tracking-wider rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                {sendingMsg ? '...' : 'SEND'}
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl mb-4 opacity-20">💬</div>
              <div className="text-nexus-muted font-game text-sm tracking-wider">
                Select a friend to start chatting
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Social;
