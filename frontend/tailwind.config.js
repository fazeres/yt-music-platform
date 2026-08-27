/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        spotify: {
          green: '#1DB954',
          black: '#121212',
          card: '#181818',
          cardHover: '#282828',
          lightBlack: '#212121',
          subtext: '#b3b3b3',
        }
      }
    },
  },
  plugins: [],
}
