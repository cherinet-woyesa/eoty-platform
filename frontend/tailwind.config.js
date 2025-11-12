/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
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
        // Neon colors for buttons and approvals
        neon: {
          cyan: '#00FFC6',
          'cyan-dark': '#00E6B8',
          green: '#39FF14',
          yellow: '#FFF59D',
          'light-blue': '#B2EBF2',
        },
        primary: {
          50: '#f0fdfa', // Light cyan
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#00FFC6', // Neon cyan
          600: '#00E6B8',
          700: '#0d9488',
          800: '#115e59',
          900: '#134e4a',
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

