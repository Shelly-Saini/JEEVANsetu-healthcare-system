/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Primary brand — deep clinical teal. Deliberately calmer and more
        // "operations dashboard" than a generic indigo/purple SaaS gradient.
        brand: {
          50: '#effcf9',
          100: '#c9f5ec',
          200: '#94ebda',
          300: '#5cd8c2',
          400: '#2fbca6',
          500: '#159e8c',
          600: '#0d7f71',
          700: '#0e655b',
          800: '#10514a',
          900: '#0f423d',
          950: '#052824',
        },
        // Neutral surface scale — cool slate, used for backgrounds/borders/text
        surface: {
          0: '#ffffff',
          50: '#f7f9fa',
          100: '#eef1f3',
          200: '#dfe4e8',
          300: '#c6cdd3',
          400: '#98a3ac',
          500: '#6b7680',
          600: '#4d5761',
          700: '#374049',
          800: '#232a31',
          900: '#161b20',
          950: '#0c0f12',
        },
        // Semantic status colors — single source of truth for badges/alerts
        status: {
          success: '#12946b',
          successBg: '#e4f7ee',
          warning: '#b5730a',
          warningBg: '#fdf1dc',
          critical: '#c22b3f',
          criticalBg: '#fbe6e9',
          info: '#1f6fb2',
          infoBg: '#e5f1fb',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 23, 27, 0.04), 0 1px 3px rgba(15, 23, 27, 0.08)',
        raised: '0 4px 12px rgba(15, 23, 27, 0.10), 0 2px 4px rgba(15, 23, 27, 0.06)',
        popover: '0 12px 32px rgba(15, 23, 27, 0.18)',
      },
      borderRadius: {
        card: '14px',
      },
      keyframes: {
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        'slide-up': { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        'pulse-ring': { '0%': { boxShadow: '0 0 0 0 rgba(21,158,140,0.35)' }, '100%': { boxShadow: '0 0 0 8px rgba(21,158,140,0)' } },
      },
      animation: {
        'fade-in': 'fade-in 0.25s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
        'pulse-ring': 'pulse-ring 1.6s cubic-bezier(0.4,0,0.6,1) infinite',
      },
    },
  },
  plugins: [],
};
