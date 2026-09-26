import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-background)',
        surface: 'var(--color-surface)',
        primary: 'var(--color-primary)',
        'on-primary': 'var(--color-on-primary)',
        accent: 'var(--color-accent)',
        'on-accent': 'var(--color-on-accent)',
        ink: 'var(--color-text)',
        'ink-muted': 'var(--color-text-muted)',
        edge: 'var(--color-border)',
        'field-primary': 'var(--color-field-primary)',
        'field-calm': 'var(--color-field-calm)',
        'field-success': 'var(--color-field-success)',
        'field-info': 'var(--color-field-info)',
        'field-notice': 'var(--color-field-notice)',
      },
      borderRadius: {
        panel: 'var(--radius-panel)',
        control: 'var(--radius-control)',
      },
      fontFamily: {
        sans: ['var(--font-body)'],
        display: ['var(--font-display)'],
      },
    },
  },
  plugins: [],
}

export default config
