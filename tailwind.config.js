/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta inspirada en metales nobles
        gold: {
          50: '#faf7ef',
          100: '#f3ecd6',
          200: '#e7d7ac',
          300: '#d9bd78',
          400: '#cca24f',
          500: '#c08b34',
          600: '#a86f28',
          700: '#8a6d1a',
          800: '#714722',
          900: '#5f3c20',
        },
        ink: {
          50: '#f6f6f7',
          100: '#e2e3e6',
          200: '#c5c7cd',
          300: '#a0a3ac',
          400: '#7c7f8a',
          500: '#61646f',
          600: '#4c4e57',
          700: '#3f4048',
          800: '#292a30',
          900: '#1a1b1f',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(16,24,40,0.06), 0 1px 2px rgba(16,24,40,0.04)',
        soft: '0 4px 16px rgba(16,24,40,0.08)',
      },
    },
  },
  plugins: [],
}
