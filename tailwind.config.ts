import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        // TerraTern Official Brand Colors
        navy: {
          50: "#F0F4FA",
          100: "#E2E9F5",
          200: "#C5D3EC",
          700: "#0B2E75",
          800: "#052669",
          900: "#00215C", // Primary Brand Navy
          950: "#00153D",
        },
        brand: {
          50: "#EEF4FF",
          100: "#DCE7FD",
          200: "#BDD3FB",
          300: "#8DB5FF", // Sky accent
          400: "#5A92F4",
          500: "#255CC1", // Primary Royal Blue
          600: "#1B479C",
          700: "#133578",
          800: "#00215C",
        },
        accent: {
          gold: "#F1C819", // Warm Gold
          goldLight: "#FFF7D6",
          coral: "#F98346", // Coral Highlight
          coralLight: "#FEE6DA",
          emerald: "#3CBD2C", // Success Green
          emeraldLight: "#E8F8E7",
        },
      },
    },
  },
  plugins: [],
};

export default config;
