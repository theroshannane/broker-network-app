// Shared design tokens. Ink-navy / emerald palette to match the marketing site.
export const theme = {
  color: {
    bg: "#0b1220",
    surface: "#131c2e",
    surfaceAlt: "#1b2740",
    border: "#243352",
    text: "#eef2f9",
    textMuted: "#9aa8c4",
    accent: "#10b981",
    accentText: "#04120c",
    danger: "#f87171",
    warn: "#fbbf24",
  },
  radius: { sm: 8, md: 12, lg: 18 },
  space: { xs: 6, sm: 10, md: 16, lg: 24, xl: 36 },
  text: { sm: 13, base: 15, lg: 18, xl: 24, hero: 30 },
} as const;

export const txnLabel: Record<string, string> = {
  sell: "Sell",
  buy: "Buy",
  rent: "Rent",
};

export function formatBudget(n: number): string {
  if (n >= 10000000) return `${(n / 10000000).toFixed(2).replace(/\.00$/, "")} Cr`;
  if (n >= 100000) return `${(n / 100000).toFixed(2).replace(/\.00$/, "")} L`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
  return String(n);
}
