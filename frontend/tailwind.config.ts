import type { Config } from "tailwindcss";
const config: Config = {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "2rem", screens: { "2xl": "1400px" } },
    extend: {
      colors: {
        base: "#0a0a0f", card: "#13131a", "card-hover": "#1a1a24",
        "border-light": "#2a2a3e", accent: "#6366f1", "accent-light": "#818cf8",
        seller: "#3b82f6", buyer: "#10b981",
        border: "#1e1e2e", input: "#1e1e2e", ring: "#6366f1",
        background: "#0a0a0f", foreground: "#e2e8f0",
        primary: { DEFAULT: "#6366f1", foreground: "#ffffff" },
        muted: { DEFAULT: "#1e1e2e", foreground: "#64748b" },
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-up": "fadeUp 0.3s ease-out",
        "slide-in-left": "slideInLeft 0.4s ease-out",
        "slide-in-right": "slideInRight 0.4s ease-out",
        "border-pulse": "borderPulse 2s ease-in-out infinite",
      },
      keyframes: {
        fadeUp: { "0%": { opacity: "0", transform: "translateY(10px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        slideInLeft: { "0%": { opacity: "0", transform: "translateX(-20px)" }, "100%": { opacity: "1", transform: "translateX(0)" } },
        slideInRight: { "0%": { opacity: "0", transform: "translateX(20px)" }, "100%": { opacity: "1", transform: "translateX(0)" } },
        borderPulse: { "0%,100%": { borderColor: "rgba(99,102,241,0.4)" }, "50%": { borderColor: "rgba(99,102,241,1)" } },
      },
      borderRadius: { lg: "0.75rem", md: "0.5rem", sm: "0.375rem" },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
