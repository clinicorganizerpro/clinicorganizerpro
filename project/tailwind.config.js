/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.65rem', { lineHeight: '1rem' }],
      },
      letterSpacing: {
        tightest: '-0.04em',
        tighter: '-0.03em',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
        '4xl': '1.5rem',
      },
      boxShadow: {
        'premium': '0 1px 0 rgba(255,255,255,0.045) inset, 0 4px 32px rgba(0,0,0,0.42)',
        'premium-lg': '0 1px 0 rgba(255,255,255,0.06) inset, 0 16px 48px rgba(0,0,0,0.52)',
        'glow-teal': '0 0 24px rgba(20,184,166,0.2)',
        'glow-emerald': '0 0 24px rgba(16,185,129,0.2)',
        'glow-blue': '0 0 24px rgba(59,130,246,0.2)',
        'glow-amber': '0 0 24px rgba(245,158,11,0.2)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-mesh': 'radial-gradient(ellipse at 15% 40%, rgba(20,184,166,0.04) 0%, transparent 55%), radial-gradient(ellipse at 85% 15%, rgba(16,185,129,0.028) 0%, transparent 45%)',
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      animation: {
        'fade-in': 'fadeIn 280ms ease-out both',
        'fade-in-up': 'fadeInUp 400ms cubic-bezier(0.16, 1, 0.3, 1) both',
      },
    },
  },
  plugins: [],
};
