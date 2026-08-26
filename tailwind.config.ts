import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F7F5EF",
        "paper-dim": "#EFEBE1",
        ink: "#16231F",
        "ink-soft": "#4B5A54",
        brand: {
          DEFAULT: "#1F6F5C",
          dark: "#123F34",
          light: "#2E8B6F",
          50: "#EAF3F0",
        },
        rust: {
          DEFAULT: "#B5473B",
          light: "#E3CFC9",
          50: "#F7EDEA",
        },
        gold: {
          DEFAULT: "#C99A2E",
          50: "#FBF3DF",
        },
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "serif"],
        body: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(22,35,31,0.04), 0 4px 16px rgba(22,35,31,0.06)",
        pop: "0 8px 30px rgba(22,35,31,0.12)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      keyframes: {
        "slide-up": {
          "0%": { transform: "translateY(12px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "slide-up": "slide-up 0.25s ease-out",
        "fade-in": "fade-in 0.15s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
