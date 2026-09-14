import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-background)',
        surface: 'var(--color-surface)',
        primary: 'var(--color-primary)',
        accent: 'var(--color-accent)',
        ink: 'var(--color-text)',
        'ink-muted': 'var(--color-text-muted)',
        edge: 'var(--color-border)',
      },
      borderRadius: {
        panel: 'var(--radius-panel)',
      },
    },
  },
  plugins: [],
}

export default config
