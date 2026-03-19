import React, { useState, useRef, useEffect, useCallback } from 'react';
import { API_BASE } from '../App';
import { useSettings } from '../hooks/useSettings';

const TIPS_TEXT =
  'Ask me to help with your research, brainstorm ideas, review your writing, explain concepts, or suggest sources for your projects.';

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-nexus-accent/10 border border-nexus-accent/30 flex items-center justify-center shrink-0 mr-2 mt-0.5 text-sm">
          🧠
        </div>
      )}
      <div
        className={`max-w-[80%] px-3 py-2.5 rounded text-sm font-game leading-relaxed ${
          isUser
            ? 'bg-nexus-accent/15 border border-nexus-accent/30 text-nexus-text'
            : 'bg-nexus-panel border border-nexus-border text-nexus-text'
        }`}
        style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
      >
        {msg.content}
      </div>
    </div>
  );
}

function AIChat() {
  const { play } = useSettings();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tipsOpen, setTipsOpen] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
      scrollToBottom();
    }
  }, [open]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  function toggleOpen() {
    play('click');
    setOpen((v) => !v);
  }

  function handleClear() {
    play('click');
    setMessages([]);
    setError('');
  }

  const [retryCountdown, setRetryCountdown] = useState(0);
  const countdownRef = useRef(null);

  const startCountdown = useCallback((seconds) => {
    setRetryCountdown(seconds);
    clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setRetryCountdown((prev) => {
        if (prev <= 1) { clearInterval(countdownRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => () => clearInterval(countdownRef.current), []);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading || retryCountdown > 0) return;

    play('click');
    setInput('');
    setError('');

    const userMsg = { role: 'user', content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages }),
      });
      const data = await res.json();

      if (res.status === 429) {
        const waitMsg = data.error || 'Rate limit reached — please wait before retrying.';
        if (data.retryAfter) startCountdown(data.retryAfter);
        setError(waitMsg);
        setMessages((prev) => [...prev, { role: 'assistant', content: `⏳ ${waitMsg}` }]);
        return;
      }

      if (!res.ok) throw new Error(data.error || 'AI chat failed');
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      const msg = err.message || 'Connection error';
      setError(msg);
      setMessages((prev) => [...prev, { role: 'assistant', content: `❌ ${msg}` }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={toggleOpen}
        className={`fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full border-2 flex items-center justify-center transition-all shadow-lg ${
          open
            ? 'bg-nexus-accent/20 border-nexus-accent text-nexus-accent'
            : 'bg-nexus-panel border-nexus-border hover:border-nexus-accent/60 text-nexus-muted hover:text-nexus-accent'
        }`}
        style={open ? { boxShadow: '0 0 20px rgba(0,212,255,0.3)' } : {}}
        title={open ? 'Close AI Assistant' : 'Open AI Assistant'}
      >
        {/* Brain / Robot SVG */}
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 2a4 4 0 014 4c0 .34-.04.67-.1 1H16a3 3 0 013 3v1a2 2 0 010 4v1a3 3 0 01-3 3H8a3 3 0 01-3-3v-1a2 2 0 010-4v-1a3 3 0 013-3h.1A4.02 4.02 0 018 6a4 4 0 014-4z" />
          <path strokeLinecap="round" d="M9 14h.01M12 14h.01M15 14h.01" strokeWidth="2" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 10v1M15 10v1" />
        </svg>
      </button>

      {/* Chat panel */}
      {open && (
        <>
          {/* Backdrop (mobile friendly) */}
          <div
            className="fixed inset-0 z-40 pointer-events-none"
            style={{ background: 'transparent' }}
          />

          <div
            className="fixed bottom-24 right-6 z-50 flex flex-col rounded border border-nexus-accent/30 bg-nexus-panel shadow-2xl"
            style={{
              width: '380px',
              height: '520px',
              boxShadow: '-4px 0 40px rgba(0,212,255,0.12), 0 8px 32px rgba(0,0,0,0.5)',
            }}
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-nexus-border flex items-center justify-between shrink-0">
              <div>
                <div className="text-nexus-accent font-game font-bold text-sm tracking-widest uppercase">
                  AI Assistant
                </div>
                <div className="text-nexus-muted font-game text-xs">
                  Gemini 2.0 Flash · ~1500 req/day free
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleClear}
                  className="px-2 py-1 text-nexus-muted hover:text-nexus-danger font-game text-xs tracking-wider rounded hover:bg-nexus-danger/10 transition-all"
                  title="Clear chat"
                >
                  CLEAR
                </button>
                <button
                  onClick={toggleOpen}
                  className="w-7 h-7 flex items-center justify-center text-nexus-muted hover:text-nexus-text transition-colors rounded"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Tips collapsible */}
            <div className="shrink-0 border-b border-nexus-border">
              <button
                onClick={() => setTipsOpen((v) => !v)}
                className="w-full px-4 py-2 flex items-center justify-between text-nexus-muted hover:text-nexus-text transition-colors"
              >
                <span className="font-game text-xs tracking-widest uppercase">Tips</span>
                <svg
                  className={`w-3.5 h-3.5 transition-transform ${tipsOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {tipsOpen && (
                <div className="px-4 pb-3">
                  <p className="text-nexus-muted font-game text-xs leading-relaxed">{TIPS_TEXT}</p>
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center gap-3">
                  <div className="text-3xl opacity-30">🧠</div>
                  <div className="text-nexus-muted font-game text-xs">
                    How can I help with your research today?
                  </div>
                </div>
              )}
              {messages.map((msg, i) => (
                <MessageBubble key={i} msg={msg} />
              ))}
              {loading && (
                <div className="flex justify-start mb-3">
                  <div className="w-7 h-7 rounded-full bg-nexus-accent/10 border border-nexus-accent/30 flex items-center justify-center shrink-0 mr-2 mt-0.5 text-sm">
                    🧠
                  </div>
                  <div className="bg-nexus-panel border border-nexus-border rounded px-3 py-2.5 flex items-center gap-1">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-1.5 h-1.5 bg-nexus-accent rounded-full pulse-glow"
                        style={{ animationDelay: `${i * 0.2}s` }}
                      />
                    ))}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-3 py-3 border-t border-nexus-border shrink-0">
              {error && (
                <div className="mb-2 text-nexus-danger font-game text-xs px-1">{error}</div>
              )}
              <div className="flex gap-2 items-end">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything... (Enter to send, Shift+Enter for newline)"
                  rows={2}
                  className="flex-1 bg-nexus-bg border border-nexus-border rounded px-3 py-2 text-nexus-text font-game text-xs placeholder-nexus-muted/40 focus:outline-none focus:border-nexus-accent/60 transition-colors resize-none leading-relaxed"
                />
                <button
                  onClick={handleSend}
                  disabled={loading || !input.trim() || retryCountdown > 0}
                  className="px-3 py-2 bg-nexus-accent/10 border border-nexus-accent text-nexus-accent hover:bg-nexus-accent/20 font-game text-xs tracking-wider rounded transition-all disabled:opacity-40 disabled:cursor-not-allowed self-end min-w-[56px] text-center"
                >
                  {retryCountdown > 0 ? `${retryCountdown}s` : 'SEND'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default AIChat;
