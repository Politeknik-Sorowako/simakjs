/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f5fa',
          100: '#dce8f3',
          200: '#b8d1e8',
          300: '#8ab4d8',
          400: '#5a92c3',
          500: '#3a76ae',
          600: '#2d5f91',
          700: '#264d76',
          800: '#0a3561',
          900: '#042d59',
          950: '#021a38',
        },
        accent: {
          50: '#fefce8',
          100: '#fef9c3',
          200: '#fef08a',
          300: '#fde047',
          400: '#fcb900',
          500: '#e6a700',
          600: '#ca8a04',
          700: '#a16207',
          800: '#854d0e',
          900: '#713f12',
          950: '#422006',
        },
        'brand-gray': {
          50: '#f8f9fa',
          100: '#f1f3f5',
          200: '#e9ecef',
          300: '#dee2e6',
          400: '#ced4da',
          500: '#6c757d',
          600: '#5a6268',
          700: '#495057',
          800: '#343a40',
          900: '#212529',
        },
      },
      fontFamily: {
        sans: ['Poppins', 'Work Sans', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        heading: ['Poppins', 'sans-serif'],
        body: ['Work Sans', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px rgba(4, 45, 89, 0.06), 0 1px 2px rgba(4, 45, 89, 0.04)',
        'card-hover': '0 10px 25px rgba(4, 45, 89, 0.08), 0 4px 10px rgba(4, 45, 89, 0.05)',
        'card-dark': '0 1px 3px rgba(0, 0, 0, 0.3)',
        'glow': '0 0 20px rgba(252, 185, 0, 0.15)',
        'glow-brand': '0 0 20px rgba(4, 45, 89, 0.15)',
        'sidebar': '4px 0 24px rgba(2, 26, 56, 0.3)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'spin-slow': 'spin 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
