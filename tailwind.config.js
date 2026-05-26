/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          900: '#312E81',
        },
        accent: { DEFAULT: '#8B5CF6' },
        success: { DEFAULT: '#10B981', bg: '#ECFDF5' },
        warning: { DEFAULT: '#F59E0B', bg: '#FFFBEB' },
        danger:  { DEFAULT: '#EF4444', bg: '#FEF2F2' },
        info:    { DEFAULT: '#0EA5E9', bg: '#F0F9FF' },
        canvas:  '#F8FAFC',
        surface: '#FFFFFF',
        muted:   '#F1F5F9',
        line:    '#E2E8F0',
        ink:     {
          900: '#0F172A',
          700: '#334155',
          500: '#475569',
          400: '#64748B',
          300: '#94A3B8',
        },
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['Sora', 'Inter', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: { xl: '12px', '2xl': '16px', '3xl': '24px' },
      boxShadow: {
        soft:    '0 1px 2px rgba(15,23,42,0.04), 0 1px 1px rgba(15,23,42,0.03)',
        card:    '0 4px 12px rgba(15,23,42,0.05), 0 1px 2px rgba(15,23,42,0.04)',
        pop:     '0 12px 32px rgba(79,70,229,0.18)',
        'pop-30':'0 12px 32px rgba(79,70,229,0.30)',
        'pop-40':'0 12px 32px rgba(79,70,229,0.40)',
        'pop-60':'0 12px 32px rgba(79,70,229,0.60)',
        ring:    '0 0 0 4px rgba(99,102,241,0.18)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #4F46E5 0%, #8B5CF6 100%)',
        'brand-soft':     'linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 100%)',
      },
      transitionTimingFunction: {
        standard:   'cubic-bezier(0.2, 0, 0, 1)',
        emphasized: 'cubic-bezier(0.05, 0.7, 0.1, 1)',
        springy:    'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
};
