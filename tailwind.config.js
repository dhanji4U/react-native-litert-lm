/** @type {import('tailwindcss').Config} */
module.exports = {
  // Check the image directory layout precisely
  content: [
    "./src/app/**/*.{js,jsx,ts,tsx}",
    "./src/components/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./App.{js,jsx,ts,tsx}", // Fallback entry point fallback
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        pill: 'var(--pill-bg)',
        'pill-border': 'var(--pill-border)',
        primary: 'var(--primary)',
        'primary-foreground': 'var(--primary-foreground)',
        muted: 'var(--muted)',
        'muted-foreground': 'var(--muted-foreground)',
        border: 'var(--border)',
        terminal: {
          dark: "#0A0A0C",
          panel: "#1C1C1E",
          accent: "#4CD964",
        },
      },
    },
  },
  plugins: [],
};
