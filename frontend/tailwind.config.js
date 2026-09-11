import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    path.join(__dirname, 'index.html'),
    path.join(__dirname, 'src/**/*.{js,ts,jsx,tsx}'),
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f4fbfe',
          100: '#e5f6fc',
          200: '#cceef8',
          300: '#b4e5f4',
          400: '#a0dceb',
          500: '#a0dceb', // Primary UI customer-management theme color #a0dceb
          600: '#7ecadb',
          700: '#5baebe',
          800: '#3e8f9e',
          900: '#266773',
        },
        dairy: {
          cream: '#FFFDD0',
          milk: '#FDFBF7',
          gold: '#EAB308',
          emerald: '#059669',
          amber: '#D97706',
          ruby: '#DC2626'
        }
      }
    },
  },
  plugins: [],
}
