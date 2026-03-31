/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: '#0A1628',
        blue: {
          DEFAULT: '#2E7CF6',
          light: '#EBF2FF',
          mid: '#C4D9FF',
        },
        bg: '#F8FAFF',
        surface: '#FFFFFF',
        border: '#E4EAFF',
        'text-primary': '#0A1628',
        'text-mid': '#3D4F6B',
        'text-soft': '#6B7A99',
        score: {
          high: '#0D7A4E',
          mid: '#B45309',
          low: '#B91C1C',
        },
        cluster: {
          a: '#2E7CF6',
          b: '#0D7A4E',
          c: '#7C3AED',
          d: '#B45309',
          e: '#C2185B',
          f: '#0891B2',
        },
        model: {
          gpt54: '#10A37F',
          o3: '#1A1A1A',
          gemini: '#4285F4',
          claude: '#D4A853',
          llama: '#0064E0',
          sonar: '#20808D',
        },
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '8px',
        lg: '12px',
      },
      boxShadow: {
        DEFAULT: '0 1px 3px rgba(10,22,40,0.06), 0 1px 2px rgba(10,22,40,0.04)',
        md: '0 4px 12px rgba(10,22,40,0.08), 0 2px 4px rgba(10,22,40,0.05)',
      },
    },
  },
  plugins: [],
}
