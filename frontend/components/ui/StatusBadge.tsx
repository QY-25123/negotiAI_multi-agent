interface Props { outcome: string; status?: string; }
export function StatusBadge({ outcome, status }: Props) {
  const isActive = status === "active";
  const cfg: Record<string, { label: string; color: string; bg: string }> = {
    agreement: { label: "Agreement", color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
    no_deal: { label: "No Deal", color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
    in_progress: { label: "In Progress", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
    failed: { label: "Failed", color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  };
  const c = isActive ? cfg.in_progress : (cfg[outcome] || cfg.in_progress);
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style={{ color: c.color, backgroundColor: c.bg }}>
      {isActive && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: c.color }} />}
      {c.label}
    </span>
  );
}
