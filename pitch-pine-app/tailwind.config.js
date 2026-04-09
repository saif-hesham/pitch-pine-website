/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#110C08',
        surface: '#1A130E',
        primary: '#F4EFE6',
        accent: '#D48C46',
        dark: '#0A0705',
      },
      fontFamily: {
        sans: ['Tajawal', 'sans-serif'],
        heading: ['Cairo', 'sans-serif'],
        drama: ['Alexandria', 'sans-serif'],
        mono: ['Tajawal', 'monospace'],
      }
    },
  },
  plugins: [],
}
