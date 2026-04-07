import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}
export function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
export function timeAgo(d: string): string {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export const SERVICE_COLORS: Record<string, string> = {
  advertising: "#f59e0b", staffing: "#10b981", sponsorship: "#8b5cf6",
};
export const SERVICE_LABELS: Record<string, string> = {
  advertising: "Advertising", staffing: "Staffing", sponsorship: "Sponsorship",
};
export const ACTION_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  proposal: { label: "Initial Proposal", color: "#818cf8", bg: "rgba(99,102,241,0.15)" },
  counter: { label: "Counter Offer", color: "#f59e0b", bg: "rgba(245,158,11,0.15)" },
  accept: { label: "✓ Accepted", color: "#22c55e", bg: "rgba(34,197,94,0.15)" },
  reject: { label: "✗ Rejected", color: "#ef4444", bg: "rgba(239,68,68,0.15)" },
};
