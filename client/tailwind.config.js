/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'warm-sand': '#FAF8F5',
        'forest': {
          DEFAULT: '#2D5A43',
          hover: '#234735',
          light: '#E8EFEA'
        },
        'amber-terracotta': {
          DEFAULT: '#D97736',
          hover: '#C26527',
          light: '#FCF3EB'
        },
        'deep-slate': '#24292F',
        'stone-border': '#E7E5E0',
        'stone-muted': '#F5F3EE'
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(0, 0, 0, 0.04)',
        'medium': '0 4px 16px rgba(0, 0, 0, 0.06)'
      }
    },
  },
  plugins: [],
}
