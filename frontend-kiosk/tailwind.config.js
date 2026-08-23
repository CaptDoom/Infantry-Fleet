/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0b0f0e',
        panel: '#101613',
        'panel-2': '#141b17',
        line: '#253028',
        'line-soft': '#1a221d',
        text: '#e8e6de',
        'text-dim': '#8f9a8c',
        'text-faint': '#5c6b58',
        olive: '#8a9a5b',
        'olive-dim': '#5f6d3f',
        amber: '#d9a441',
        red: '#c1440e',
        steel: '#5c8a94',
      },
      fontFamily: {
        mono: ['"IBM Plex Mono"', 'monospace'],
        sans: ['"IBM Plex Sans"', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
