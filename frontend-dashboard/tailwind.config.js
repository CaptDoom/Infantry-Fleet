/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: '#0a0e17',
        'bg-dark': '#060911',
        panel: '#101726',
        'panel-2': '#162032',
        'panel-3': '#1c283f',
        line: '#24324a',
        'line-soft': '#192336',
        text: '#f1f5f9',
        'text-dim': '#94a3b8',
        'text-faint': '#64748b',
        olive: '#8a9a5b',
        'olive-dim': '#5f6d3f',
        amber: '#f59e0b',
        'amber-bright': '#fbbf24',
        gold: '#eab308',
        'gold-bright': '#facc15',
        red: '#ef4444',
        'red-bright': '#f87171',
        steel: '#38bdf8',
        cyan: '#06b6d4',
        emerald: '#10b981',
        green: '#22c55e',
        border: 'var(--border, #24324a)',
        input: 'var(--input, #24324a)',
        ring: 'var(--ring, #eab308)',
        background: 'var(--background, #0a0e17)',
        foreground: 'var(--foreground, #f1f5f9)',
        primary: {
          DEFAULT: 'var(--primary, #eab308)',
          foreground: 'var(--primary-foreground, #0a0e17)',
        },
        secondary: {
          DEFAULT: 'var(--secondary, #162032)',
          foreground: 'var(--secondary-foreground, #f1f5f9)',
        },
        muted: {
          DEFAULT: 'var(--muted, #162032)',
          foreground: 'var(--muted-foreground, #94a3b8)',
        },
        accent: {
          DEFAULT: 'var(--accent, #1c283f)',
          foreground: 'var(--accent-foreground, #f1f5f9)',
        },
        destructive: {
          DEFAULT: 'var(--destructive, #ef4444)',
          foreground: 'var(--destructive-foreground, #ffffff)',
        },
        card: {
          DEFAULT: 'var(--card, #101726)',
          foreground: 'var(--card-foreground, #f1f5f9)',
        },
        popover: {
          DEFAULT: 'var(--popover, #101726)',
          foreground: 'var(--popover-foreground, #f1f5f9)',
        },
        sidebar: {
          DEFAULT: 'var(--sidebar, #0a0e17)',
          foreground: 'var(--sidebar-foreground, #f1f5f9)',
          primary: 'var(--sidebar-primary, #eab308)',
          'primary-foreground': 'var(--sidebar-primary-foreground, #0a0e17)',
          accent: 'var(--sidebar-accent, #162032)',
          'accent-foreground': 'var(--sidebar-accent-foreground, #f1f5f9)',
          border: 'var(--sidebar-border, #24324a)',
          ring: 'var(--sidebar-ring, #eab308)',
        },
      },
      fontFamily: {
        mono: ['"IBM Plex Mono"', 'monospace'],
        sans: ['"IBM Plex Sans"', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'radar-sweep': 'radarSweep 4s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        radarSweep: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
    },
  },
  plugins: [],
}

