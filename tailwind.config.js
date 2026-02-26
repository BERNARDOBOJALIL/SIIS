/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary:       'var(--color-primary)',
        'primary-dark':'var(--color-primary-dark)',
        'primary-light':'var(--color-primary-light)',
        'site-white':  'var(--color-site-white)',
        'site-black':  'var(--color-site-black)',
        'site-bg':     'var(--color-bg)',
        'site-surface':'var(--color-surface)',
        'site-border': 'var(--color-border)',
        'site-text':   'var(--color-text)',
        'site-muted':  'var(--color-text-muted)',
      },
    },
  },
  plugins: [],
}

