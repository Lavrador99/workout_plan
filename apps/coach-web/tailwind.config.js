/** Colours live in index.css, one set per theme. */
const token = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: token('bg'),
        fg: token('fg'),
        card: token('card'),
        card2: token('card2'),
        border: token('border'),
        accent: token('accent'),
        accent2: token('accent2'),
        danger: token('danger'),
        warn: token('warn'),
        success: token('success'),
        muted: token('muted'),
        'on-accent': token('on-accent'),
      },
      fontFamily: {
        sans: ['"Inter Variable"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '12px',
      },
    },
  },
  plugins: [],
}
