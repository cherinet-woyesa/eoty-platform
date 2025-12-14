/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand Colors
        brand: {
          primary: '#1e1b4b',
          'primary-dark': '#312e81',
          accent: '#cfa15a',
          soft: 'rgba(120, 160, 131, 0.1)',
          success: '#4CAF50',
          warning: '#FFC107',
          danger: '#DC3545',
        },
        // Light base colors
        beige: {
          50: '#fafaf9',
          100: '#f5f5f0',
          200: '#e8e8e0',
          300: '#d4d4c4',
        },
        silver: {
          50: '#f8f8f8',
          100: '#e8e8e8',
          200: '#d3d3d3',
          300: '#c0c0c0',
        },
      },
      fontFamily: {
        sans: ["'Inter'", '-apple-system', 'BlinkMacSystemFont', "'Segoe UI'", "'Roboto'", 'sans-serif'],
      },
      animation: {
        'spin': 'spin 1s linear infinite',
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}

