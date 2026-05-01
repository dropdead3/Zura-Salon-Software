import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        serif: ['"Laguna"', 'Georgia', 'serif'],
        sans: ['"Aeonik Pro"', 'system-ui', 'sans-serif'],
        display: ['"Termina"', 'sans-serif'],
        script: ['"Sloop Script"', 'cursive'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
          strong: "hsl(var(--muted-strong))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        oat: {
          DEFAULT: "hsl(var(--oat))",
          foreground: "hsl(var(--oat-foreground))",
        },
        gold: {
          DEFAULT: "hsl(var(--gold))",
          foreground: "hsl(var(--gold-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      transitionTimingFunction: {
        // Premium spring-feel easings (Wave 1 motion choreography)
        spring: "cubic-bezier(0.32, 0.72, 0, 1)",          // Apple-style overshoot
        "spring-linear": "cubic-bezier(0.16, 1, 0.3, 1)",  // Linear-style ease-out
        "spring-soft": "cubic-bezier(0.22, 1, 0.36, 1)",   // Notion-style soft landing
      },
      boxShadow: {
        // 3-tier premium shadow ladder
        "premium-rest": "0 1px 2px 0 hsl(var(--foreground) / 0.04), 0 1px 3px 0 hsl(var(--foreground) / 0.06)",
        "premium-hover": "0 4px 8px -2px hsl(var(--foreground) / 0.08), 0 8px 16px -4px hsl(var(--foreground) / 0.10)",
        "premium-drag": "0 12px 24px -6px hsl(var(--foreground) / 0.16), 0 20px 40px -10px hsl(var(--foreground) / 0.18)",
        // Inner specular highlight for "material" reads
        "inner-highlight": "inset 0 1px 0 0 hsl(var(--foreground) / 0.04)",
        "inner-highlight-strong": "inset 0 1px 0 0 hsl(var(--foreground) / 0.08)",
      },
      borderRadius: {
        none: "0",
        xs: "2px",
        sm: "3px",
        md: "5px",
        DEFAULT: "5px",
        lg: "10px",
        xl: "20px",
        "2xl": "30px",
        "3xl": "40px",
        full: "9999px",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "slide-in-left": {
          "0%": { transform: "translateX(-20px)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        "slide-in-right": {
          "0%": { transform: "translateX(20px)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        "blur-in": {
          "0%": { filter: "blur(8px)", opacity: "0" },
          "100%": { filter: "blur(0)", opacity: "1" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        "marquee": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "shine": {
          "0%": { backgroundPosition: "200% 0" },
          "15%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        "bounce-once": {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.15)" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        "swing": {
          "0%, 100%": { transform: "rotate(0deg)" },
          "20%": { transform: "rotate(12deg)" },
          "40%": { transform: "rotate(-10deg)" },
          "60%": { transform: "rotate(6deg)" },
          "80%": { transform: "rotate(-4deg)" },
        },
        "skeleton-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.94" },
        },
        "glow": {
          "0%, 100%": { opacity: "0.3" },
          "50%": { opacity: "0.6" },
        },
        "nudge-right": {
          "0%, 100%": { transform: "translateX(0)" },
          "50%": { transform: "translateX(3px)" },
        },
        promoFabPulse: {
          "0%, 100%": { transform: "scale(1)", boxShadow: "0 10px 30px -10px hsl(0 0% 0% / 0.35)" },
          "50%": { transform: "scale(1.08)", boxShadow: "0 18px 40px -8px hsl(0 0% 0% / 0.45)" },
        },
        // Soft "breathing" ring for dirty action buttons (Save needs attention).
        // Pre-attentive cue without motion noise — opacity-only on a fixed ring.
        "dirty-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 0 hsl(var(--warning) / 0.35)" },
          "50%": { boxShadow: "0 0 0 6px hsl(var(--warning) / 0)" },
        "backdrop-blur-in-md": {
          "0%": { backdropFilter: "blur(0px) saturate(100%)", WebkitBackdropFilter: "blur(0px) saturate(100%)" },
          "100%": { backdropFilter: "blur(12px) saturate(120%)", WebkitBackdropFilter: "blur(12px) saturate(120%)" },
        },
        "backdrop-blur-in-2xl": {
          "0%": { backdropFilter: "blur(0px) saturate(100%)", WebkitBackdropFilter: "blur(0px) saturate(100%)" },
          "100%": { backdropFilter: "blur(40px) saturate(150%)", WebkitBackdropFilter: "blur(40px) saturate(150%)" },
        },
      },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "fade-in-up": "fade-in-up 0.6s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
        "slide-in-left": "slide-in-left 0.4s ease-out",
        "slide-in-right": "slide-in-right 0.4s ease-out",
        "blur-in": "blur-in 0.5s ease-out",
        "float": "float 3s ease-in-out infinite",
        "marquee": "marquee 25s linear infinite",
        "shine": "shine 8s ease-in-out infinite",
        "bounce-once": "bounce-once 0.3s ease-out",
        "shimmer": "shimmer 3s ease-in-out infinite",
        "swing": "swing 1s ease-in-out infinite",
        "skeleton-pulse": "skeleton-pulse 2s ease-in-out infinite",
        "nudge-right": "nudge-right 1s ease-in-out infinite",
        "dirty-pulse": "dirty-pulse 2s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/container-queries")],
} satisfies Config;
