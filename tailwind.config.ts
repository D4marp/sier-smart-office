import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2f46a3',
        secondary: '#483688',
        accent: '#7ca6ff',
        dark: '#2f46a3',
        light: '#ffffff',
        gray: '#cbcbcb',
      },
    },
  },
  plugins: [],
}
export default config
