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
        primary: '#201547',
        secondary: '#483688',
        accent: '#d8ae47',
        dark: '#201547',
        light: '#ffffff',
        gray: '#cbcbcb',
      },
    },
  },
  plugins: [],
}
export default config
