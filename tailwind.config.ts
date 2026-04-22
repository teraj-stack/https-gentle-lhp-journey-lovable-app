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
        sans: ['Inter', 'sans-serif'],
        serif: ['Cormorant Garamond', 'serif'],
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
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sage: {
          DEFAULT: "hsl(var(--sage))",
          foreground: "hsl(var(--sage-foreground))",
        },
        "warm-beige": {
          DEFAULT: "hsl(var(--warm-beige))",
          foreground: "hsl(var(--warm-beige-foreground))",
        },
        gold: {
          DEFAULT: "hsl(var(--gold))",
          foreground: "hsl(var(--gold-foreground))",
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
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
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
        // Puls dla wiersza, do którego wykonano skok w nawigatorze dopasowań.
        // Pulsuje box-shadow (podwójny ring: zewnętrzny halo + wewnętrzny outline)
        // + tło + subtelne scale, żeby wiersz natychmiast „skoczył" wzrokowo.
        // 3 pełne cykle × ~600ms = ~1.8s całkowitego czasu trwania.
        "jump-pulse": {
          "0%, 100%": {
            boxShadow:
              "inset 0 0 0 0 hsl(var(--primary) / 0), 0 0 0 0 hsl(var(--primary) / 0)",
            backgroundColor: "hsl(var(--primary) / 0.08)",
            transform: "scale(1)",
          },
          "50%": {
            boxShadow:
              "inset 0 0 0 2px hsl(var(--primary) / 0.95), 0 0 0 6px hsl(var(--primary) / 0.45), 0 0 24px 4px hsl(var(--primary) / 0.35)",
            backgroundColor: "hsl(var(--primary) / 0.28)",
            transform: "scale(1.012)",
          },
        },
        // Trwalszy obrys (~3s) zostający na wierszu PO zakończeniu pulse —
        // żeby user nie tracił z oczu „gdzie jestem" gdy animacja wygaśnie.
        "jump-afterglow": {
          "0%": {
            boxShadow:
              "inset 0 0 0 2px hsl(var(--primary) / 0.9), 0 0 0 3px hsl(var(--primary) / 0.4)",
            backgroundColor: "hsl(var(--primary) / 0.18)",
          },
          "100%": {
            boxShadow:
              "inset 0 0 0 1px hsl(var(--primary) / 0), 0 0 0 0 hsl(var(--primary) / 0)",
            backgroundColor: "hsl(var(--primary) / 0)",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "jump-pulse": "jump-pulse 0.6s ease-in-out 3",
        "jump-afterglow": "jump-afterglow 2.4s ease-out 1 forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
