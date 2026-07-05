/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        sepia: {
          100: '#f3ead9',
          200: '#e7d7ba',
          300: '#d9c19a',
          400: '#c8a97a',
          500: '#b08f5c',
          600: '#8d6f45',
          700: '#6b5334',
        },
      },
      fontFamily: {
        // Brand: Cormorant Garamond (display) + Source Serif 4 (reading) + Source Sans 3 (UI) — self-hosted via @fontsource
        display: ['"Cormorant Garamond"', '"Iowan Old Style"', 'Palatino', 'Georgia', 'serif'],
        reading: ['"Source Serif 4"', 'Georgia', 'serif'],
        body: ['"Source Sans 3"', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
