/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        roman: {
          bg: '#080E1E',
          'bg-deep': '#050914',
          surface: '#0E1A36',
          'surface-light': '#162852',
          'surface-elevated': '#1D3366',
          navy: '#0B1630',
          'navy-mid': '#112247',
          gold: '#C8A752',
          'gold-bright': '#F0D278',
          'gold-pale': '#F7E9BC',
          'gold-muted': '#8C7335',
          cream: '#F5EFE6',
          'cream-muted': '#C8BFA8',
          stone: '#7D6F59',
          'stone-dark': '#4A4135',
          emerald: '#15803D',
          'emerald-bright': '#22C55E',
          ruby: '#991B1B',
          'ruby-bright': '#EF4444',
        }
      },
      fontFamily: {
        serif: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      backgroundImage: {
        'roman-pattern': "url(\"data:image/svg+xml,%3Csvg width='48' height='48' viewBox='0 0 48 48' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23C8A752' fill-opacity='0.05'%3E%3Cpath d='M24 22v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-18V0h-2v4h-4v2h4v4h2V6h4V4h-4zM4 22v-4H2v4H0v2h4v4h2v-4h4v-2H4zM4 4V0H2v4H0v2h4v4h2V6h4V4H4z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
      },
      animation: {
        'pulse-gold': 'pulse-gold 2.5s ease-in-out infinite',
        'fade-in': 'fade-in 0.35s ease-out',
        'slide-up': 'slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scale-in 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        'pulse-gold': {
          '0%, 100%': { boxShadow: '0 0 15px rgba(200, 167, 82, 0.25)' },
          '50%': { boxShadow: '0 0 30px rgba(200, 167, 82, 0.55)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      }
    },
  },
  plugins: [],
}
