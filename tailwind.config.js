/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: '#14110d',
        'ink-2': '#1b1611',
        panel: '#211b14',
        'panel-2': '#2a2218',
        gold: {
          DEFAULT: '#c9a96a',
          bright: '#e7cd95',
          dim: 'rgba(201, 169, 106, 0.34)',
        },
        vermilion: {
          DEFAULT: '#c0392b',
          soft: '#b8443a',
        },
        fg: {
          DEFAULT: '#ece3d2',
          dim: '#a99c84',
          faint: '#6f6453',
        },
        line: 'rgba(201, 169, 106, 0.3)',
        jade: '#3f7d5a',
      },
      fontFamily: {
        serif: ['Noto Serif SC', 'Songti SC', 'STSong', 'SimSun', 'serif'],
        brush: ['Ma Shan Zheng', 'STKaiti', 'KaiTi', 'Noto Serif SC', 'serif'],
      },
      maxWidth: {
        app: '880px',
      },
      borderRadius: {
        card: '14px',
      },
      keyframes: {
        blink: {
          '0%, 80%, 100%': { opacity: '0.25' },
          '40%': { opacity: '1' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'pop-in': {
          from: { opacity: '0', transform: 'scale(0.94) translateY(6px)' },
          to: { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        'qian-shake': {
          '0%': { transform: 'translateX(-3px) rotate(-1deg)' },
          '50%': { transform: 'translateX(3px) rotate(1deg)' },
          '100%': { transform: 'translateX(-3px) rotate(-1deg)' },
        },
      },
      animation: {
        blink: 'blink 1.2s infinite ease-in-out',
        'fade-up': 'fade-up 0.28s ease',
        'fade-in': 'fade-in 0.18s ease',
        'pop-in': 'pop-in 0.2s ease',
        'qian-shake': 'qian-shake 0.18s linear infinite',
      },
    },
  },
  plugins: [],
};
