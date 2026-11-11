/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  // `dark:` utilities follow the `dark` class ThemeContext keeps on <html> in step with the
  // effective theme; the tokens themselves follow data-theme and prefers-color-scheme.
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Primary: LLM Translate's teal accent. 600 and 700 are the light theme's accent and
        // hover (src/theme.css), 300 and 200 the dark theme's.
        primary: {
          50: '#f0fdfa',
          100: '#e6f4f2',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#5eead4',
          500: '#0f766e',
          600: '#0f766e',
          700: '#115e59',
          800: '#115e59',
          900: '#12302d',
          950: '#042f2e',
        },
        // Enhanced secondary colors (slate shades) with higher contrast
        secondary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        // New accent colors (purple shades for highlights)
        accent: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7e22ce',
          800: '#6b21a8',
          900: '#581c87',
          950: '#3b0764',
        },
        // Vibrant success colors
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          700: '#15803d',
        },
        // Vibrant error colors
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          500: '#ef4444',
          700: '#b91c1c',
        },
      },
      // Semantic colours, type and spacing tokens are in src/index.css.
      // Add box shadow variations
      boxShadow: {
        'soft': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'glow': '0 0 15px rgba(56, 189, 248, 0.5)',
        'inner-light': 'inset 0 2px 4px 0 rgba(255, 255, 255, 0.05)',
      },
      // Add animation utilities
      animation: {
        'bounce-slow': 'bounce 3s infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.5s ease-in',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      // Add background patterns
      backgroundImage: {
        'dot-pattern': 'radial-gradient(#e2e8f0 1px, transparent 1px)',
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      backgroundSize: {
        'dot-sm': '20px 20px',
      },
      // Add screen size for smaller devices
      screens: {
        'xs': '480px',
        // Default breakpoints remain unchanged
      },
    },
  },
}
