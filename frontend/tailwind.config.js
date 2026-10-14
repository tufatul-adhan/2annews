/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: { ink: '#202722', pitch: '#176B45', lime: '#dce8df', mist: '#f0f3ee' },
    },
  },
  plugins: [],
};
