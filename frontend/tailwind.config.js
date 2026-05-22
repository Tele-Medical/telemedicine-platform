/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0F766E',
          50: '#ECFDF5',
          100: '#CCFBF1',
          600: '#0F766E',
          700: '#0F5F59',
        },
        info: {
          DEFAULT: '#2563EB',
          600: '#2563EB',
        },
        success: {
          DEFAULT: '#15803D',
          600: '#15803D',
        },
        warning: {
          DEFAULT: '#B45309',
          600: '#B45309',
        },
        danger: {
          DEFAULT: '#B91C1C',
          600: '#B91C1C',
        },
        neutral: {
          0: '#FFFFFF',
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          500: '#64748B',
          700: '#334155',
          900: '#0F172A',
        },
        background: '#F8FAFC',
        surface: '#FFFFFF',
        'text-primary': '#0F172A',
        'text-secondary': '#64748B',
        'success-sync': '#15803D',
        'warning-offline': '#B45309',
        'error': '#B91C1C',
      },
      spacing: {
        'space-1': '4px',
        'space-2': '8px',
        'space-3': '12px',
        'space-4': '16px',
        'space-5': '20px',
        'space-6': '24px',
        'space-8': '32px',
        'space-10': '40px',
        'space-12': '48px',
      },
      borderRadius: {
        'radius-sm': '4px',
        'radius-md': '6px',
        'radius-lg': '8px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
