/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50:  '#ecedf2',
          100: '#d0d2dd',
          200: '#a2a5bb',
          300: '#737899',
          400: '#535873',
          500: '#333D51',
          600: '#2b3445',
          700: '#232b39',
          800: '#1b212d',
          900: '#131821',
        },
        gold: {
          50:  '#fdf9eb',
          100: '#faf0c8',
          200: '#f0dc80',
          300: '#e5c94e',
          400: '#D3AC2B',
          500: '#b89420',
          600: '#967818',
          700: '#745d12',
          800: '#52420d',
          900: '#302708',
        },
        mist: {
          50:  '#f7f8f9',
          100: '#eff0f3',
          200: '#dfe1e6',
          300: '#CBD0D8',
          400: '#a8aebb',
          500: '#858c9e',
          600: '#6b7186',
          700: '#555a6e',
          800: '#404456',
          900: '#2a2d3e',
        },
        cream: {
          50:  '#fdfdf9',
          100: '#F4F3EA',
          200: '#eae9da',
          300: '#dddccc',
          400: '#c7c6b4',
          500: '#a5a494',
        },
      },
      fontFamily: {
        gmarket: ['"GmarketSans"', 'sans-serif'],
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
      },
      animation: {
        slideUp: 'slideUp 0.4s ease-out',
        fadeIn: 'fadeIn 0.3s ease-out',
      },
    },
  },
  plugins: [],
}
