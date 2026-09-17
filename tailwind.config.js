/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./site/index.html', './site/js/**/*.js'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
        tech: ['Orbitron', 'sans-serif'],
      },
      colors: {
        acmBlue: '#005596',
        acmCyan: '#00d4ff',
        acmDark: '#0f172a',
        acmTextLight: '#003359',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'fade-in-up': 'fadeInUp 0.8s ease-out forwards',
        'logo-live': 'logoBreath 4s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-15px)' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        logoBreath: {
          '0%, 100%': { transform: 'scale(1) rotate(0deg)', filter: 'brightness(100%)' },
          '50%': { transform: 'scale(1.05) rotate(3deg)', filter: 'brightness(110%)' },
        },
      },
    },
  },
  plugins: [],
};
