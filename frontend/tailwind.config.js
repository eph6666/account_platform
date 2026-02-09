/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    // Background colors for cards
    'bg-blue-50',
    'bg-purple-50',
    'bg-emerald-50',
    'bg-gray-50',
    'dark:bg-blue-900/10',
    'dark:bg-purple-900/10',
    'dark:bg-emerald-900/10',
    'dark:bg-gray-800/50',
    // Gradient colors for icons
    'from-blue-500',
    'to-blue-600',
    'from-blue-500',
    'to-indigo-600',
    'from-purple-500',
    'to-purple-600',
    'from-emerald-500',
    'to-emerald-600',
    'from-emerald-500',
    'to-teal-600',
    'from-gray-500',
    'to-gray-600',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
      },
    },
  },
  plugins: [],
  darkMode: 'class',
}
