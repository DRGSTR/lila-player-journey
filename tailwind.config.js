/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#090d16',
        surface: '#0f172a',
        panel: '#131d31',
        card: '#18243c',
        border: '#1f2e4d',
        human: '#06b6d4',
        bot: '#f59e0b',
        pvpKill: '#ef4444',
        botKill: '#f97316',
        stormDeath: '#a855f7',
        lootItem: '#eab308'
      }
    },
  },
  plugins: [],
}
