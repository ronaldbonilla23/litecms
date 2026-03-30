/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        "surface": "#0e0e0e",
        "primary": "#C2F86C",
        "on-surface": "#ffffff",
        "on-surface-variant": "#adaaaa",
        "surface-container-low": "#131313",
        "surface-container-highest": "#262626",
        "outline-variant": "#484848",
        "error": "#ff7351",
      },
      fontFamily: {
        "headline": ["Plus Jakarta Sans", "sans-serif"],
        "body": ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
}
