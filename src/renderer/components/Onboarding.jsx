import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE, useUser } from '../App';

function Onboarding() {
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { loginUser } = useUser();
  const navigate = useNavigate();

  function resetForm() {
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setError('');
  }

  function switchTab(t) {
    setTab(t);
    resetForm();
  }

  async function handleRegister(e) {
    e.preventDefault();
    const u = username.trim();
    if (!u) return setError('Please enter a username.');
    if (u.length < 2) return setError('Username must be at least 2 characters.');
    if (u.length > 24) return setError('Username must be 24 characters or less.');
    if (!password) return setError('Please enter a password.');
    if (password.length < 4) return setError('Password must be at least 4 characters.');
    if (password !== confirmPassword) return setError('Passwords do not match.');

    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) return setError('That username is already taken. Choose another.');
        return setError(data.error || 'Failed to create account.');
      }
      loginUser(data, rememberMe);
      navigate('/', { replace: true });
    } catch {
      setError('Cannot connect to server. Make sure the app is running correctly.');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    const u = username.trim();
    if (!u) return setError('Please enter your username.');

    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, password }),
      });
      const data = await res.json();

      if (res.ok) {
        loginUser(data, rememberMe);
        navigate('/', { replace: true });
        return;
      }

      // Backward compat: if no password set, server returns needsPassword:false
      // and accepts login — but our server already handles that internally.
      setError(data.error || 'Login failed. Check your credentials.');
    } catch {
      setError('Cannot connect to server. Make sure the app is running correctly.');
    } finally {
      setLoading(false);
    }
  }

  const isLogin = tab === 'login';

  return (
    <div className="h-full flex items-center justify-center bg-nexus-bg relative overflow-hidden">
      {/* Background grid effect */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage:
            'linear-gradient(#00d4ff 1px, transparent 1px), linear-gradient(90deg, #00d4ff 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Radial glow */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(0,212,255,0.07) 0%, transparent 70%)',
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center max-w-md w-full px-8 fade-in-up">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 relative">
            <svg viewBox="0 0 120 120" className="w-24 h-24">
              <polygon
                points="60,5 112,32.5 112,87.5 60,115 8,87.5 8,32.5"
                fill="rgba(0,212,255,0.08)"
                stroke="#00d4ff"
                strokeWidth="2"
              />
              <polygon
                points="60,20 97,40 97,80 60,100 23,80 23,40"
                fill="rgba(0,212,255,0.05)"
                stroke="#00d4ff"
                strokeWidth="1.5"
                strokeOpacity="0.5"
              />
              <circle cx="60" cy="60" r="12" fill="rgba(0,212,255,0.2)" stroke="#00d4ff" strokeWidth="1.5" />
              <circle cx="60" cy="60" r="5" fill="#00d4ff" />
              <line x1="60" y1="48" x2="60" y2="20" stroke="#00d4ff" strokeWidth="1" strokeOpacity="0.4" />
              <line x1="60" y1="72" x2="60" y2="100" stroke="#00d4ff" strokeWidth="1" strokeOpacity="0.4" />
              <line x1="50" y1="56.5" x2="23" y2="40" stroke="#00d4ff" strokeWidth="1" strokeOpacity="0.4" />
              <line x1="70" y1="63.5" x2="97" y2="80" stroke="#00d4ff" strokeWidth="1" strokeOpacity="0.4" />
              <line x1="50" y1="63.5" x2="23" y2="80" stroke="#00d4ff" strokeWidth="1" strokeOpacity="0.4" />
              <line x1="70" y1="56.5" x2="97" y2="40" stroke="#00d4ff" strokeWidth="1" strokeOpacity="0.4" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold font-game tracking-widest text-nexus-accent uppercase mb-2">
            PRODUCTIVITY NEXUS
          </h1>
          <p className="text-nexus-muted font-game tracking-widest text-sm uppercase">
            Rank Up Your Real Life
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="w-full flex mb-6 border border-nexus-border rounded overflow-hidden">
          <button
            type="button"
            onClick={() => switchTab('login')}
            className={`flex-1 py-2.5 font-game text-sm tracking-widest uppercase transition-all ${
              isLogin
                ? 'bg-nexus-accent/15 text-nexus-accent border-r border-nexus-accent/30'
                : 'text-nexus-muted hover:text-nexus-text border-r border-nexus-border'
            }`}
          >
            LOGIN
          </button>
          <button
            type="button"
            onClick={() => switchTab('register')}
            className={`flex-1 py-2.5 font-game text-sm tracking-widest uppercase transition-all ${
              !isLogin
                ? 'bg-nexus-accent/15 text-nexus-accent'
                : 'text-nexus-muted hover:text-nexus-text'
            }`}
          >
            REGISTER
          </button>
        </div>

        {/* Form */}
        <form onSubmit={isLogin ? handleLogin : handleRegister} className="w-full space-y-4">
          {/* Username */}
          <div>
            <label className="block text-nexus-muted font-game text-xs tracking-widest uppercase mb-2">
              Operative Callsign
            </label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(''); }}
                placeholder="Enter your username..."
                maxLength={24}
                className="w-full bg-nexus-panel border border-nexus-border text-nexus-text font-game text-lg px-4 py-3 rounded focus:outline-none focus:border-nexus-accent transition-colors placeholder-nexus-muted/50"
                style={{ fontFamily: 'Rajdhani, sans-serif' }}
                autoFocus
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-nexus-muted font-mono text-xs">
                {username.length}/24
              </div>
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-nexus-muted font-game text-xs tracking-widest uppercase mb-2">
              {isLogin ? 'Access Code' : 'Set Access Code'}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              placeholder={isLogin ? 'Enter password...' : 'Create a password...'}
              className="w-full bg-nexus-panel border border-nexus-border text-nexus-text font-game text-lg px-4 py-3 rounded focus:outline-none focus:border-nexus-accent transition-colors placeholder-nexus-muted/50"
              style={{ fontFamily: 'Rajdhani, sans-serif' }}
            />
          </div>

          {/* Confirm Password (register only) */}
          {!isLogin && (
            <div>
              <label className="block text-nexus-muted font-game text-xs tracking-widest uppercase mb-2">
                Confirm Access Code
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                placeholder="Re-enter password..."
                className="w-full bg-nexus-panel border border-nexus-border text-nexus-text font-game text-lg px-4 py-3 rounded focus:outline-none focus:border-nexus-accent transition-colors placeholder-nexus-muted/50"
                style={{ fontFamily: 'Rajdhani, sans-serif' }}
              />
            </div>
          )}

          {/* Remember Me */}
          <label className="flex items-center gap-3 cursor-pointer select-none group">
            <div className="relative">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="sr-only"
              />
              <div
                className={`w-5 h-5 rounded border transition-all ${
                  rememberMe
                    ? 'bg-nexus-accent/20 border-nexus-accent'
                    : 'bg-nexus-panel border-nexus-border group-hover:border-nexus-accent/50'
                }`}
              >
                {rememberMe && (
                  <svg className="w-3 h-3 text-nexus-accent m-auto mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
            <span className="text-nexus-muted font-game text-xs tracking-wider uppercase group-hover:text-nexus-text transition-colors">
              Stay Logged In
            </span>
          </label>

          {error && (
            <div className="px-4 py-3 bg-nexus-danger/10 border border-nexus-danger/30 rounded text-nexus-danger font-game text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !username.trim()}
            className="w-full py-4 bg-nexus-accent/10 hover:bg-nexus-accent/20 border border-nexus-accent text-nexus-accent font-game font-bold text-xl tracking-widest uppercase rounded transition-all hover:glow-accent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-nexus-accent border-t-transparent rounded-full animate-spin" />
                {isLogin ? 'AUTHENTICATING...' : 'DEPLOYING...'}
              </span>
            ) : (
              isLogin ? 'ACCESS NEXUS' : 'BEGIN ASCENT'
            )}
          </button>
        </form>

        {/* Footer info */}
        <p className="mt-8 text-nexus-muted font-game text-xs tracking-wide text-center opacity-60">
          Your progress is saved locally on this machine.
          <br />
          No internet required to get started.
        </p>
      </div>
    </div>
  );
}

export default Onboarding;
