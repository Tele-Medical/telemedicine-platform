/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#6B8E7B',
        secondary: '#4A8F96',
        background: '#F9F8F6',
        surface: '#FFFFFF',
        'text-primary': '#2D3748',
        'text-secondary': '#4A5568',
        'success-sync': '#38A169',
        'warning-offline': '#D69E2E',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
