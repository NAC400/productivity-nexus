/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/**/*.{js,jsx,ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        nexus: {
          bg: '#0a0e1a',
          panel: '#0f1629',
          border: '#1e2d4a',
          accent: '#00d4ff',
          gold: '#f5c518',
          silver: '#c0c0c0',
          bronze: '#cd7f32',
          platinum: '#e5e4e2',
          diamond: '#b9f2ff',
          master: '#9b59b6',
          success: '#00ff88',
          danger: '#ff4757',
          text: '#e0e6f0',
          muted: '#6b7fa3',
        },
      },
      fontFamily: {
        game: ['"Rajdhani"', 'sans-serif'],
        mono: ['"Fira Code"', 'monospace'],
      },
    },
  },
  plugins: [],
};
