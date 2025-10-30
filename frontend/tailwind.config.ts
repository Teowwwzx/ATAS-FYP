// frontend/tailwind.config.ts
import type { Config } from 'tailwindcss'
import colors from 'tailwindcss/colors'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}', // Next.js App Router
    './components/**/*.{js,ts,jsx,tsx,mdx}', // Our components folder
  ],
  theme: {
    extend: {
      colors: {
        // We'll use "neutral" as our base gray
        gray: colors.neutral,
        // Define our "energetic" primary color
        primary: {
          '50': '#f5f3ff',
          '100': '#ede9fe',
          '200': '#ddd6fe',
          '300': '#c4b5fd',
          '400': '#a78bfa',
          '500': '#8b5cf6', // Our main primary color
          '600': '#7c3aed',
          '700': '#6d28d9',
          '800': '#5b21b6',
          '900': '#4c1d95',
          '950': '#2e1065',
        },
      },
      // Define animations for Modals and Toasts
      keyframes: {
        fadeIn: {
          'from': { opacity: '0' },
          'to': { opacity: '1' },
        },
        slideUpAndFade: {
          'from': { opacity: '0', transform: 'translateY(24px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 200ms ease-out',
        slideUpAndFade: 'slideUpAndFade 300ms cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'), // For styling form inputs
  ],
}
export default config