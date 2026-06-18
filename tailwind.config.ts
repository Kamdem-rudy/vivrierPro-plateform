import type { Config } from 'tailwindcss'
const config: Config = {
  content: ['./src/pages/**/*.{js,ts,jsx,tsx,mdx}','./src/components/**/*.{js,ts,jsx,tsx,mdx}','./src/app/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: { extend: { colors: { primary: { 50:'#f0fdf4',100:'#dcfce7',200:'#bbf7d0',500:'#22c55e',600:'#16a34a',700:'#15803d',800:'#166534',900:'#14532d' } }, fontFamily: { sans: ['Inter','system-ui','sans-serif'] } } },
  plugins: [require('tailwindcss-animate')],
}
export default config
