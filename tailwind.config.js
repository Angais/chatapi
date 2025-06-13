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
        background: 'rgb(var(--background))',
        foreground: 'rgb(var(--foreground))',
        card: 'rgb(var(--card))',
        'card-foreground': 'rgb(var(--card-foreground))',
        border: 'rgb(var(--border))',
        input: 'rgb(var(--input))',
        primary: 'rgb(var(--primary))',
        'primary-foreground': 'rgb(var(--primary-foreground))',
        secondary: 'rgb(var(--secondary))',
        'secondary-foreground': 'rgb(var(--secondary-foreground))',
        muted: 'rgb(var(--muted))',
        'muted-foreground': 'rgb(var(--muted-foreground))',
        accent: 'rgb(var(--accent))',
        'accent-foreground': 'rgb(var(--accent-foreground))',
        ring: 'rgb(var(--ring))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
} 