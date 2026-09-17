/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Extraído do design (login com gradiente vinho/laranja, cor de destaque laranja)
        primary: {
          DEFAULT: '#EA580C',
          dark: '#7C2D12',
        },
      },
    },
  },
  darkMode: 'class', // design tem tema claro e escuro
  plugins: [],
};
