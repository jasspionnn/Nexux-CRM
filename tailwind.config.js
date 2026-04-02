/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'sans-serif'] },
      colors: {
        brand: {
          cyan:  '#00D2FF',
          navy:  '#00455B',
          lost:  '#A5EDFF',
          gray:  '#F3F4F6',
        }
      },
      keyframes: {
        progress: {
          '0%':   { width: '0%' },
          '100%': { width: '100%' },
        }
      },
      animation: {
        progress: 'progress 4s linear',
      }
    }
  },
  plugins: [],
}
