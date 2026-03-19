import { useState, useEffect, useCallback } from 'react';

const SETTINGS_KEY = 'nexus_settings';

const DEFAULT_SETTINGS = {
  masterVolume: 0.6,
  sfxEnabled: true,
  musicEnabled: false,
};

// Shared AudioContext (lazy init to comply with browser autoplay policies)
let _audioCtx = null;
function getAudioCtx() {
  if (!_audioCtx) {
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  // Resume if suspended (browser autoplay policy)
  if (_audioCtx.state === 'suspended') {
    _audioCtx.resume().catch(() => {});
  }
  return _audioCtx;
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (_) {}
  return { ...DEFAULT_SETTINGS };
}

// ── Sound generation helpers ──────────────────────────────────────────────────

function playTone(ctx, freq, startTime, duration, volume, type = 'sine', fadeOut = true) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);

  gain.gain.setValueAtTime(volume, startTime);
  if (fadeOut) {
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  }

  osc.start(startTime);
  osc.stop(startTime + duration + 0.01);
}

/**
 * Play a named sound effect.
 * @param {'click'|'success'|'rankUp'|'abandon'} type
 * @param {object} [settings] - optional settings override (masterVolume, sfxEnabled)
 */
export function playSound(type, settings = null) {
  const s = settings || loadSettings();
  if (!s.sfxEnabled) return;
  const vol = Math.max(0, Math.min(1, s.masterVolume ?? 0.6));
  if (vol === 0) return;

  try {
    const ctx = getAudioCtx();
    const now = ctx.currentTime;

    switch (type) {
      case 'click': {
        // Short crisp tick
        playTone(ctx, 880, now, 0.06, vol * 0.35, 'square', true);
        break;
      }

      case 'success': {
        // Ascending arpeggio: C4 E4 G4 C5
        const notes = [261.63, 329.63, 392.0, 523.25];
        notes.forEach((freq, i) => {
          playTone(ctx, freq, now + i * 0.1, 0.25, vol * 0.45, 'sine', true);
        });
        break;
      }

      case 'rankUp': {
        // Triumphant fanfare: G4 B4 D5 G5
        const fanfare = [392.0, 493.88, 587.33, 784.0];
        fanfare.forEach((freq, i) => {
          playTone(ctx, freq, now + i * 0.13, 0.4, vol * 0.5, 'triangle', true);
        });
        // Add a shimmer on top
        playTone(ctx, 1568.0, now + 0.52, 0.3, vol * 0.2, 'sine', true);
        break;
      }

      case 'abandon': {
        // Descending sad tones: A4 F4 D4
        const sad = [440.0, 349.23, 293.66];
        sad.forEach((freq, i) => {
          playTone(ctx, freq, now + i * 0.14, 0.3, vol * 0.4, 'sine', true);
        });
        break;
      }

      default:
        break;
    }
  } catch (err) {
    // Web Audio not supported or blocked — silently ignore
    console.warn('playSound error:', err.message);
  }
}

// ── useSettings hook ──────────────────────────────────────────────────────────

export function useSettings() {
  const [settings, setSettings] = useState(loadSettings);

  useEffect(() => {
    // Keep settings in sync across tabs
    function onStorage(e) {
      if (e.key === SETTINGS_KEY) {
        setSettings(loadSettings());
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const updateSettings = useCallback((updates) => {
    setSettings((prev) => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      } catch (_) {}
      return next;
    });
  }, []);

  const play = useCallback(
    (soundType) => playSound(soundType, settings),
    [settings]
  );

  return { settings, updateSettings, play };
}
