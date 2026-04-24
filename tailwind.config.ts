import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Admin (dark OKLCH). <alpha-value> lets opacity modifiers work (e.g. bg-admin-teal/20).
        admin: {
          bg: 'oklch(0.12 0.015 230 / <alpha-value>)',
          bg2: 'oklch(0.16 0.018 228 / <alpha-value>)',
          bg3: 'oklch(0.20 0.02 226 / <alpha-value>)',
          border: 'oklch(0.28 0.02 228 / <alpha-value>)',
          text: 'oklch(0.95 0.005 220 / <alpha-value>)',
          text2: 'oklch(0.60 0.015 225 / <alpha-value>)',
          text3: 'oklch(0.40 0.015 225 / <alpha-value>)',
          teal: 'oklch(0.75 0.18 175 / <alpha-value>)',
          'teal-dim': 'oklch(0.75 0.18 175 / 0.15)',
          gold: 'oklch(0.78 0.17 82 / <alpha-value>)',
          'gold-dim': 'oklch(0.78 0.17 82 / 0.15)',
          green: 'oklch(0.72 0.17 145 / <alpha-value>)',
          red: 'oklch(0.68 0.21 25 / <alpha-value>)',
        },

        // Angler (light warm OKLCH).
        angler: {
          bg: 'oklch(0.96 0.008 80)',
          bg2: 'oklch(0.92 0.01 80)',
          white: 'oklch(1 0 0)',
          border: 'oklch(0.88 0.01 80)',
          text: 'oklch(0.18 0.015 230)',
          text2: 'oklch(0.45 0.02 230)',
          text3: 'oklch(0.65 0.015 230)',
          teal: 'oklch(0.55 0.18 175)',
          'teal-l': 'oklch(0.55 0.18 175 / 0.12)',
          'teal-m': 'oklch(0.55 0.18 175 / 0.25)',
          gold: 'oklch(0.68 0.17 82)',
          'gold-l': 'oklch(0.68 0.17 82 / 0.12)',
          purple: 'oklch(0.58 0.18 290)',
          'purple-l': 'oklch(0.58 0.18 290 / 0.12)',
          green: 'oklch(0.58 0.17 145)',
          bronze: '#cd7f32',
        },
      },
      fontFamily: {
        sans: ['Outfit', 'system-ui', 'sans-serif'],
        outfit: ['Outfit', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card-light': '0 2px 12px oklch(0 0 0 / 0.06), 0 1px 3px oklch(0 0 0 / 0.04)',
        'elevated-light': '0 4px 24px oklch(0 0 0 / 0.10), 0 1px 4px oklch(0 0 0 / 0.06)',
        sheet: '0 -8px 40px oklch(0 0 0 / 0.15)',
      },
      transitionTimingFunction: {
        'spring-pill': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        sheet: 'cubic-bezier(0.32, 0.72, 0, 1)',
      },
      animation: {
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'bounce-in': 'bounceIn 0.4s cubic-bezier(0.34,1.56,0.64,1)',
        'fade-up': 'fadeUp 0.28s ease-out',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        bounceIn: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        fadeUp: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config
