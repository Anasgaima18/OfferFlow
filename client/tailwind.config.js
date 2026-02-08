/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#050505",
        primary: "#FFB800",
        secondary: "#14B8A6",
        surface: "#111111", // Slightly lighter for cards
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'glow-radial': 'radial-gradient(circle, rgba(20, 184, 166, 0.15) 0%, rgba(5, 5, 5, 0) 70%)',
      }
    },
  },
  plugins: [],
}
