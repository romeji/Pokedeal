import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: {
          950: "#0a0d12",
          900: "#0f141b",
          800: "#161c26",
          700: "#212a37",
          600: "#374254",
        },
        signal: {
          exceptional: "#ff5470",
          great: "#ff8c42",
          good: "#ffb703",
          watch: "#8ecae6",
          ignore: "#4a5568",
        },
        market: {
          profit: "#35d0a0",
          loss: "#ef476f",
          accent: "#7c5cff",
        },
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      borderRadius: {
        card: "10px",
      },
    },
  },
  plugins: [],
};

export default config;
