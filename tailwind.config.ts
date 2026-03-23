import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0A0A0F",
        accent: "#F59E0B",
        muted: "#A1A1AA",
        border: "#27272A",
        verdict: {
          welfare: "#22C55E",
          productive: "#84CC16",
          complicated: "#F59E0B",
          freebieish: "#F97316",
          freebie: "#EF4444",
        },
      },
      fontFamily: {
        display: ["Space Grotesk", "sans-serif"],
        body: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
