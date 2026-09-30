import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Nunito",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      colors: {
        gold: {
          100: "#f9edc9",
          200: "#f3da93",
          300: "#ecc65c",
          400: "#e6b433",
          500: "#d4a017",
          600: "#b3860f",
          700: "#8a670c",
          800: "#614809",
        },
        ink: {
          950: "#050506",
          900: "#0a0a0d",
          800: "#121216",
          700: "#1b1b21",
          600: "#26262e",
        },
      },
      backgroundImage: {
        "gold-gradient": "linear-gradient(135deg, #f9edc9 0%, #d4a017 45%, #8a670c 100%)",
        "gold-gradient-soft": "linear-gradient(135deg, #f3da93 0%, #b3860f 100%)",
      },
      boxShadow: {
        glossy: "0 1px 0 0 rgba(255,255,255,0.15) inset, 0 -6px 12px 0 rgba(0,0,0,0.35) inset, 0 12px 30px -8px rgba(212,160,23,0.35)",
        card: "0 1px 0 0 rgba(255,255,255,0.06) inset, 0 20px 40px -20px rgba(0,0,0,0.8)",
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        "float-slow": "float 9s ease-in-out infinite",
        "spin-slow": "spin 18s linear infinite",
        glow: "glow 2.4s ease-in-out infinite",
        shimmer: "shimmer 3.5s linear infinite",
        "ring-spin": "ringSpin 14s linear infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px) rotate(0deg)" },
          "50%": { transform: "translateY(-14px) rotate(3deg)" },
        },
        glow: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(212,160,23,0.45)" },
          "50%": { boxShadow: "0 0 26px 6px rgba(212,160,23,0.4)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "0% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        ringSpin: {
          "0%": { transform: "rotate(-16deg)" },
          "100%": { transform: "rotate(344deg)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
