/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Pure black / white / gray — only allowed palette
        dark: {
          bg: '#000000',        // Pure black background
          card: '#111111',      // Card surface
          border: '#2a2a2a',    // Border
          hover: '#1a1a1a',     // Hover state
          text: '#ffffff',      // Primary text (white)
          secondary: '#888888', // Secondary text (gray)
          muted: '#555555',     // Muted / placeholder
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        heart: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.3) rotate(-10deg)' },
          '100%': { transform: 'scale(1)' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 4px rgba(255,255,255,0.15)' },
          '50%': { boxShadow: '0 0 14px rgba(255,255,255,0.28)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideRight: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.3s ease-out',
        heart: 'heart 0.4s ease-in-out',
        glow: 'glow 2s ease-in-out infinite',
        slideUp: 'slideUp 0.3s ease-out',
        slideRight: 'slideRight 0.3s ease-out',
        shimmer: 'shimmer 2s linear infinite',
      },
      boxShadow: {
        'glow-sm': '0 0 4px rgba(255,255,255,0.15)',
        'glow-md': '0 0 10px rgba(255,255,255,0.25)',
        'glow-lg': '0 0 20px rgba(255,255,255,0.35)',
      },
    },
  },
  plugins: [],
};
