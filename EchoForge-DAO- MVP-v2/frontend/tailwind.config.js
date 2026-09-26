/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // X Lights Out 纯黑配色 + Web3 微调
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#1d9bf0',
          500: '#1d9bf0', // X Blue
          600: '#1a8cd8',
          700: '#1471b0',
          800: '#0f5a8a',
          900: '#0a3d5c',
        },
        dark: {
          bg: '#000000',       // 纯黑 BG (X Lights Out)
          card: '#16181c',     // Surface/Card
          border: '#2f3336',   // Border
          hover: '#0f0f0f',    // Hover/Focus
          text: '#ffffff',     // Primary text (白字)
          secondary: '#71767b', // Secondary text
          muted: '#8899ac',    // Muted/Placeholder
        },
        success: {
          DEFAULT: '#00ba7c',
          50: '#e6faf3',
          100: '#bff5e1',
          200: '#99f0cf',
          300: '#66e6b8',
          400: '#33dba1',
          500: '#00ba7c', // 主色
          600: '#009e68',
          700: '#007f53',
          800: '#005f3d',
          900: '#003f28',
        },
        error: '#f4212e',      // 错误/拒绝
        xblue: '#1d9bf0',      // X Blue Accent
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
          '0%, 100%': { boxShadow: '0 0 5px #1d9bf0' },
          '50%': { boxShadow: '0 0 20px #1d9bf0, 0 0 40px #1d9bf033' },
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
        'glow-sm': '0 0 5px #1d9bf0',
        'glow-md': '0 0 10px #1d9bf0',
        'glow-lg': '0 0 20px #1d9bf0, 0 0 40px #1d9bf033',
      },
    },
  },
  plugins: [],
};
