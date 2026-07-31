/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Sampled from the show art: the logo plate is #030404, the wordmark is
        // white with a #FE0100 drop shadow, and the glitch textures supply the
        // secondary accents.
        ink: {
          900: '#08090A', // page
          800: '#0E1012', // raised surface
          700: '#14171A', // card
          600: '#1D2126', // border
          500: '#2A2F36', // strong border
        },
        bone: {
          50: '#FFFFFF',
          100: '#E8EAED',
          200: '#B7BCC4', // body copy
          300: '#878D97', // muted
          400: '#5F656E', // faint
        },
        signal: {
          DEFAULT: '#FE0100', // brand red, straight off the wordmark
          bright: '#FF3B30',  // links / text on dark
          dim: '#B00100',
        },
        glitch: {
          teal: '#00AC7C',
          blue: '#73A5C0',
          purple: '#8A42BE',
          magenta: '#DD1695',
        },
        tier: {
          s: '#E8515A',
          a: '#E8964F',
          b: '#E3D164',
          c: '#A7D46A',
          d: '#5FC79A',
          f: '#7F8FE0',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        content: '68rem',
      },
      keyframes: {
        rise: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        rise: 'rise 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}
