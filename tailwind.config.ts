import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        saffron: {
          50: "#fff8eb",
          100: "#ffecc8",
          200: "#ffd685",
          300: "#ffbb47",
          400: "#ffa01e",
          500: "#f4a300",
          600: "#d97d00",
          700: "#b45b05",
          800: "#92470b",
          900: "#783b0f",
        },
        krishna: {
          50: "#f7f3ff",
          100: "#efe7ff",
          200: "#dccbff",
          300: "#c1a3ff",
          400: "#a372ff",
          500: "#8b4dff",
          600: "#7a30f5",
          700: "#6b2fa5",
          800: "#561e85",
          900: "#47196d",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        serif: ["Georgia", "serif"],
      },
    },
  },
  plugins: [],
};
export default config;
