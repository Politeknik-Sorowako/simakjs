/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Mendukung dark mode berbasis class pada tag <html>
  theme: {
    extend: {
      colors: {
        // Navy Blue - Melambangkan kredibilitas dan wibawa akademis institusi
        primary: {
          DEFAULT: '#1E3A8A', // Navy Utama
          50: '#F8FAFC',      // Latar belakang mode terang terbersih
          100: '#E2E8F0',     // Zebra striping tabel / border halus
          200: '#CBD5E1',     // Garis pemisah komponen
          300: '#94A3B8',     // Teks pembantu / ikon non-aktif
          400: '#64748B',     // Teks sekunder pelengkap
          500: '#1E3A8A',     // Brand utama / Header
          600: '#1D4ED8',     // Hover state elemen primer
          700: '#1E293B',     // Warna permukaan sekunder malam (card dark)
          800: '#0F172A',     // Teks utama siang / warna permukaan gelap
          900: '#0B132B',     // Latar belakang mode gelap terdalam (dark-bg)
          950: '#020813',     // Kegelapan pekat untuk gradasi estetik
        },
        // Slate Steel - Memberikan struktur visual yang bersih pada tabel data dan form
        secondary: {
          DEFAULT: '#64748B',
          50: '#F1F5F9',      // Latar belakang card ringan
          100: '#E2E8F0',
          200: '#CBD5E1',
          300: '#94A3B8',
          400: '#64748B',
          500: '#475569',
          600: '#334155',
          700: '#1E293B',
          800: '#0F172A',
          900: '#0B132B',
          950: '#020617',
        },
        // Brand Alias - Menyelaraskan dengan Primary untuk kompabilitas template Anda
        brand: {
          50: '#F8FAFC',
          100: '#E2E8F0',
          200: '#CBD5E1',
          500: '#1E3A8A',
          600: '#1D4ED8',
          700: '#172554',
          800: '#0F172A',
          900: '#0B132B',
        },
        // Sky Blue / Teal - Aksen fokus tinggi untuk konversi tombol, tautan penting & notifikasi
        accent: {
          DEFAULT: '#0284C7', // Sky Blue tepercaya
          50: '#F0F9FF',
          100: '#E0F2FE',
          200: '#BAE6FD',
          300: '#7DD3FC',
          400: '#38BDF8',
          500: '#0284C7',     // Tombol utama / link aktif
          600: '#0369A1',     // Hover state tombol aksen
          700: '#075985',
          800: '#0369A1',
          900: '#0C4A6E',
          950: '#082F49',
        },
        // Tetap mempertahankan variasi abu-abu kustom hangat Anda untuk fleksibilitas isi dokumen
        'brand-gray': {
          50: '#FEFCFA',
          100: '#F7EDE3',
          200: '#EED9C4',
          300: '#E0C4A8',
          400: '#CDAC8A',
          500: '#B8946C',
          600: '#A07850',
          700: '#835F3C',
          800: '#66472A',
          900: '#49301C',
          950: '#2E1B0E',
        },
      },
      fontFamily: {
        sans: ['Poppins', 'Work Sans', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        heading: ['Poppins', 'sans-serif'],
        body: ['Work Sans', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px rgba(15, 23, 42, 0.05), 0 1px 2px rgba(15, 23, 42, 0.03)',
        'card-hover': '0 12px 30px rgba(15, 23, 42, 0.08), 0 4px 12px rgba(15, 23, 42, 0.04)',
        'card-dark': '0 4px 20px rgba(0, 0, 0, 0.4)',
        'glow': '0 0 20px rgba(2, 132, 199, 0.2)',
        'glow-brand': '0 0 20px rgba(30, 58, 138, 0.2)',
        'sidebar': '4px 0 24px rgba(11, 19, 43, 0.25)',
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
