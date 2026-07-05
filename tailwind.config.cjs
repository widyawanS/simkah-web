/** @type {import('tailwindcss').Config} */
const defaultTheme = require("tailwindcss/defaultTheme");
module.exports = {
  darkMode: 'class',
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      colors: {
        // Pastel Brutalism palette
        'brand-primary': 'var(--brand-primary)',
        'brand-secondary': 'var(--brand-secondary)',
        'brutal-primary': 'var(--brutal-primary)',
        'brutal-secondary': 'var(--brutal-secondary)',
        'brutal-accent': 'var(--brutal-accent)',
        'brutal-destructive': 'var(--brutal-destructive)',
        'brutal-success': 'var(--brutal-success)',
        'brutal-warning': 'var(--brutal-warning)',
        'brutal-info': 'var(--brutal-info)',
        'brutal-bg': 'var(--brutal-bg)',
        'brutal-bg-alt': 'var(--brutal-bg-alt)',
        'brutal-card': 'var(--brutal-card-bg)',
        'brutal-text': 'var(--brutal-text)',
        'brutal-text-muted': 'var(--brutal-text-muted)',
        'brutal-border': 'var(--brutal-border-color)',
      },
      borderWidth: {
        '3': '3px',
      },
      borderRadius: {
        'brutal': 'var(--brutal-radius)',
      },
      boxShadow: {
        'brutal': 'var(--brutal-shadow-offset-x) var(--brutal-shadow-offset-y) 0px 0px var(--brutal-shadow-color)',
        'brutal-sm': '2px 2px 0px 0px var(--brutal-shadow-color)',
        'brutal-lg': '5px 5px 0px 0px var(--brutal-shadow-color)',
        'brutal-hover': '5px 5px 0px 0px var(--brutal-shadow-color)',
        'brutal-active': '0px 0px 0px 0px var(--brutal-shadow-color)',
      },
      fontFamily: {
        sans: [
          "Bricolage Grotesque",
          "Inter Variable",
          "Inter",
          ...defaultTheme.fontFamily.sans,
        ],
        display: [
          "Bricolage Grotesque",
          ...defaultTheme.fontFamily.sans,
        ],
        serif: [
          "Playfair Display",
          ...defaultTheme.fontFamily.serif,
        ],
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
