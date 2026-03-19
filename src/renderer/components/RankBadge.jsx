import React from 'react';

const RANK_CONFIG = {
  Iron: {
    color: '#708090',
    bg: 'rgba(112,128,144,0.15)',
    border: '#708090',
    glyph: 'Fe',
  },
  Bronze: {
    color: '#cd7f32',
    bg: 'rgba(205,127,50,0.15)',
    border: '#cd7f32',
    glyph: 'Br',
  },
  Silver: {
    color: '#c0c0c0',
    bg: 'rgba(192,192,192,0.15)',
    border: '#c0c0c0',
    glyph: 'Ag',
  },
  Gold: {
    color: '#f5c518',
    bg: 'rgba(245,197,24,0.15)',
    border: '#f5c518',
    glyph: 'Au',
  },
  Platinum: {
    color: '#e5e4e2',
    bg: 'rgba(229,228,226,0.15)',
    border: '#e5e4e2',
    glyph: 'Pt',
  },
  Diamond: {
    color: '#b9f2ff',
    bg: 'rgba(185,242,255,0.15)',
    border: '#b9f2ff',
    glyph: '◆',
  },
  Master: {
    color: '#9b59b6',
    bg: 'rgba(155,89,182,0.15)',
    border: '#9b59b6',
    glyph: 'M',
  },
  Grandmaster: {
    color: '#ff6b35',
    bg: 'rgba(255,107,53,0.15)',
    border: '#ff6b35',
    glyph: 'GM',
  },
};

function RankBadge({ rank = 'Iron', size = 'md', showLabel = true }) {
  const config = RANK_CONFIG[rank] || RANK_CONFIG.Iron;

  const sizeClasses = {
    xs: { hex: 24, fontSize: 6, labelSize: 'text-xs', padding: 'px-1.5 py-0.5' },
    sm: { hex: 28, fontSize: 8, labelSize: 'text-xs', padding: 'px-2 py-0.5' },
    md: { hex: 40, fontSize: 11, labelSize: 'text-sm', padding: 'px-3 py-1' },
    lg: { hex: 56, fontSize: 14, labelSize: 'text-base', padding: 'px-4 py-1.5' },
    xl: { hex: 72, fontSize: 18, labelSize: 'text-lg', padding: 'px-5 py-2' },
  };

  const s = sizeClasses[size] || sizeClasses.md;

  return (
    <div className="flex items-center gap-1.5">
      {/* Hexagonal badge */}
      <div className="relative flex items-center justify-center" style={{ width: s.hex, height: s.hex }}>
        <svg
          viewBox="0 0 100 100"
          style={{ width: s.hex, height: s.hex, position: 'absolute' }}
        >
          <polygon
            points="50,5 95,27.5 95,72.5 50,95 5,72.5 5,27.5"
            fill={config.bg}
            stroke={config.color}
            strokeWidth="4"
          />
        </svg>
        <span
          style={{
            color: config.color,
            fontSize: s.fontSize,
            fontWeight: 700,
            fontFamily: 'Rajdhani, sans-serif',
            position: 'relative',
            zIndex: 1,
            letterSpacing: '0.05em',
          }}
        >
          {config.glyph}
        </span>
      </div>

      {/* Label */}
      {showLabel && (
        <span
          className={`font-game font-bold tracking-wider uppercase ${s.labelSize}`}
          style={{ color: config.color }}
        >
          {rank}
        </span>
      )}
    </div>
  );
}

export default RankBadge;
