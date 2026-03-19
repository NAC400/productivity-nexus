import React, { useState } from 'react';
import { useUser } from '../App';
import { API_BASE } from '../App';
import { useSettings, playSound } from '../hooks/useSettings';

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

function SettingsRow({ label, description, children }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-nexus-border/50 last:border-0">
      <div className="flex-1 min-w-0 mr-6">
        <div className="text-nexus-text font-game text-sm font-bold tracking-wide">{label}</div>
        {description && (
          <div className="text-nexus-muted font-game text-xs mt-0.5">{description}</div>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-12 h-6 rounded-full border transition-all duration-200 ${
        value
          ? 'bg-nexus-accent/20 border-nexus-accent'
          : 'bg-nexus-border/50 border-nexus-border'
      }`}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 rounded-full transition-all duration-200 ${
          value ? 'left-6 bg-nexus-accent' : 'left-0.5 bg-nexus-muted'
        }`}
        style={value ? { boxShadow: '0 0 8px rgba(0,212,255,0.6)' } : {}}
      />
    </button>
  );
}

function VolumeSlider({ value, onChange }) {
  return (
    <div className="flex items-center gap-3 w-48">
      <svg className="w-4 h-4 text-nexus-muted shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 6a7 7 0 010 12M9 9H5l-3 3v0l3 3h4l3-3-3-3z" />
      </svg>
      <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 h-1.5 rounded appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, #00d4ff ${value * 100}%, #1e2d4a ${value * 100}%)`,
          accentColor: '#00d4ff',
        }}
      />
      <span className="text-nexus-muted font-mono text-xs w-8 text-right">
        {Math.round(value * 100)}%
      </span>
    </div>
  );
}

function Settings() {
  const { user, logoutUser } = useUser();
  const { settings, updateSettings } = useSettings();
  const [apiStatus, setApiStatus] = useState(null); // null | 'testing' | 'ok' | 'fail'
  const [apiError, setApiError] = useState('');

  function handleMasterVolume(val) {
    updateSettings({ masterVolume: val });
  }

  function handleSfxToggle(val) {
    updateSettings({ sfxEnabled: val });
    if (val) playSound('click', { ...settings, sfxEnabled: true });
  }

  async function handleTestAPI() {
    setApiStatus('testing');
    setApiError('');
    playSound('click', settings);
    try {
      const res = await fetch(`${API_BASE}/ai/test`);
      const data = await res.json();
      if (res.ok && data.success) {
        setApiStatus('ok');
        playSound('success', settings);
      } else {
        setApiStatus('fail');
        setApiError(data.error || 'API test failed');
        playSound('abandon', settings);
      }
    } catch (err) {
      setApiStatus('fail');
      setApiError(err.message || 'Could not reach backend');
      playSound('abandon', settings);
    }
  }

  function handleSignOut() {
    playSound('click', settings);
    logoutUser();
  }

  const joinDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—';

  return (
    <div className="h-full overflow-y-auto bg-nexus-bg">
      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Page header */}
        <div className="mb-8">
          <div className="text-nexus-muted font-game text-xs tracking-widest uppercase mb-1">
            System Configuration
          </div>
          <div className="text-nexus-accent font-game font-bold text-2xl tracking-widest uppercase">
            Settings
          </div>
        </div>

        {/* ── AUDIO ── */}
        <div className="mb-8 p-5 bg-nexus-panel border border-nexus-border rounded">
          <SectionHeader title="Audio" />

          <SettingsRow
            label="Master Volume"
            description="Overall volume level for all sounds"
          >
            <VolumeSlider
              value={settings.masterVolume}
              onChange={handleMasterVolume}
            />
          </SettingsRow>

          <SettingsRow
            label="Sound Effects"
            description="Button clicks, notifications, and UI feedback"
          >
            <Toggle value={settings.sfxEnabled} onChange={handleSfxToggle} />
          </SettingsRow>

          {/* Sound test buttons */}
          <div className="mt-4 pt-4 border-t border-nexus-border/50">
            <div className="text-nexus-muted font-game text-xs tracking-widest uppercase mb-3">
              Test Sounds
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Click', type: 'click' },
                { label: 'Success', type: 'success' },
                { label: 'Rank Up', type: 'rankUp' },
                { label: 'Abandon', type: 'abandon' },
              ].map(({ label, type }) => (
                <button
                  key={type}
                  onClick={() => playSound(type, settings)}
                  className="px-3 py-1.5 border border-nexus-border text-nexus-muted hover:border-nexus-accent/50 hover:text-nexus-accent font-game text-xs tracking-wider rounded transition-all"
                >
                  ▶ {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── APPEARANCE ── */}
        <div className="mb-8 p-5 bg-nexus-panel border border-nexus-border rounded">
          <SectionHeader title="Appearance" />
          <div className="flex flex-col items-center justify-center py-6 gap-3">
            <div className="text-3xl opacity-40">🎨</div>
            <div className="text-nexus-muted font-game text-sm tracking-wider text-center">
              More themes coming soon
            </div>
            <div className="text-nexus-muted/50 font-game text-xs text-center">
              Dark Nexus theme is currently active
            </div>
          </div>
        </div>

        {/* ── AI / API ── */}
        <div className="mb-8 p-5 bg-nexus-panel border border-nexus-border rounded">
          <SectionHeader title="AI Connection" />

          <p className="text-nexus-muted font-game text-xs mb-4">
            Productivity Nexus uses the Gemini 2.0 Flash API to generate quests and score submissions.
            Set your <span className="text-nexus-accent font-mono">GEMINI_API_KEY</span> in the{' '}
            <span className="font-mono text-nexus-accent">.env</span> file at the project root.
          </p>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleTestAPI}
              disabled={apiStatus === 'testing'}
              className="px-4 py-2 border border-nexus-accent text-nexus-accent hover:bg-nexus-accent/10 font-game text-xs tracking-wider rounded transition-all disabled:opacity-50"
            >
              {apiStatus === 'testing' ? (
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 border-2 border-nexus-accent border-t-transparent rounded-full animate-spin inline-block" />
                  TESTING...
                </span>
              ) : (
                '⚡ Test API Connection'
              )}
            </button>

            {apiStatus === 'ok' && (
              <div className="flex items-center gap-2 text-nexus-success font-game text-xs">
                <span className="w-2 h-2 rounded-full bg-nexus-success pulse-glow" />
                Connected — Gemini API is working
              </div>
            )}
            {apiStatus === 'fail' && (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-nexus-danger font-game text-xs">
                  <span className="w-2 h-2 rounded-full bg-nexus-danger" />
                  Connection failed
                </div>
                {apiError && (
                  <div className="text-nexus-danger/70 font-mono text-xs max-w-xs break-words">
                    {apiError}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── ACCOUNT ── */}
        <div className="p-5 bg-nexus-panel border border-nexus-border rounded">
          <SectionHeader title="Account" />

          <div className="space-y-3 mb-6">
            <SettingsRow label="Username" description="Your operative callsign">
              <span className="text-nexus-accent font-game text-sm font-bold">
                {user?.username || '—'}
              </span>
            </SettingsRow>
            <SettingsRow label="Rank" description="Current combat rank">
              <span className="text-nexus-gold font-game text-sm font-bold">
                {user?.rank || '—'}
              </span>
            </SettingsRow>
            <SettingsRow label="Total XP" description="Experience points accumulated">
              <span className="text-nexus-text font-game text-sm font-bold">
                {user?.xp?.toLocaleString() || '0'}
              </span>
            </SettingsRow>
            <SettingsRow label="Joined" description="Account creation date">
              <span className="text-nexus-muted font-game text-sm">{joinDate}</span>
            </SettingsRow>
          </div>

          <div className="pt-4 border-t border-nexus-border/50">
            <button
              onClick={handleSignOut}
              className="px-5 py-2 border border-nexus-danger/50 text-nexus-danger hover:bg-nexus-danger/10 hover:border-nexus-danger font-game text-sm tracking-wider rounded transition-all"
            >
              ✕ Sign Out
            </button>
            <p className="mt-2 text-nexus-muted/50 font-game text-xs">
              You will be returned to the login screen.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
