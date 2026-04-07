"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency, timeAgo, SERVICE_COLORS, SERVICE_LABELS } from "@/lib/utils";
import { CompanyAvatar } from "@/components/ui/CompanyAvatar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Building2, MessageSquare, CheckCircle2, DollarSign, TrendingUp, Activity } from "lucide-react";
import Link from "next/link";

function StatCard({ label, value, icon: Icon, color, sub }: { label: string; value: string; icon: React.ElementType; color: string; sub?: string }) {
  return (
    <div className="bg-[#13131a] border border-[#1e1e2e] rounded-xl p-5 hover:border-[#2a2a3e] transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-[#64748b] font-medium">{label}</p>
          <p className="text-3xl font-bold mt-1 text-[#e2e8f0]">{value}</p>
          {sub && <p className="text-xs text-[#64748b] mt-1">{sub}</p>}
        </div>
        <div className="p-2.5 rounded-lg" style={{ backgroundColor: `${color}20` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data: stats } = useQuery({ queryKey: ["stats"], queryFn: api.stats.get, refetchInterval: 30000 });
  const { data: negotiations } = useQuery({ queryKey: ["negotiations", "recent"], queryFn: () => api.negotiations.list() });
  const { data: activity } = useQuery({ queryKey: ["activity"], queryFn: api.stats.activity, refetchInterval: 30000 });

  const recent = negotiations?.slice(0, 6) || [];

  return (
    <div className="p-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#e2e8f0]">Dashboard</h1>
        <p className="text-[#64748b] mt-1">Monitor your AI negotiation platform</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Companies" value={String(stats?.total_companies ?? "—")} icon={Building2} color="#6366f1" sub="Registered on platform" />
        <StatCard label="Negotiations" value={String(stats?.total_negotiations ?? "—")} icon={MessageSquare} color="#3b82f6" sub="All time" />
        <StatCard label="Deals Closed" value={String(stats?.completed_negotiations ?? "—")} icon={CheckCircle2} color="#22c55e" sub="Successful agreements" />
        <StatCard label="Value Negotiated" value={stats ? formatCurrency(stats.total_value_closed) : "—"} icon={DollarSign} color="#8b5cf6" sub="Total contract value" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Recent Negotiations */}
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#e2e8f0] flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#6366f1]" /> Recent Negotiations
            </h2>
            <Link href="/negotiations" className="text-sm text-[#6366f1] hover:text-[#818cf8] transition-colors">View all →</Link>
          </div>
          <div className="space-y-3">
            {recent.length === 0 && <div className="bg-[#13131a] border border-[#1e1e2e] rounded-xl p-8 text-center text-[#64748b]">No negotiations yet</div>}
            {recent.map(neg => (
              <Link key={neg.id} href={`/negotiations/${neg.id}`}>
                <div className="bg-[#13131a] border border-[#1e1e2e] rounded-xl p-4 hover:border-[#2a2a3e] hover:bg-[#1a1a24] transition-all cursor-pointer group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ color: SERVICE_COLORS[neg.service_type], backgroundColor: `${SERVICE_COLORS[neg.service_type]}20` }}>
                        {SERVICE_LABELS[neg.service_type]}
                      </span>
                      <StatusBadge outcome={neg.outcome} status={neg.status} />
                    </div>
                    {neg.final_value && <span className="text-sm font-bold text-[#22c55e]">{formatCurrency(neg.final_value)}</span>}
                  </div>
                  <p className="text-sm font-medium text-[#e2e8f0] group-hover:text-white mb-2 truncate">{neg.title}</p>
                  <div className="flex items-center gap-2">
                    <CompanyAvatar name={neg.seller.name} initials={neg.seller.logo_initials} color={neg.seller.avatar_color} size="sm" />
                    <span className="text-xs text-[#64748b]">{neg.seller.name}</span>
                    <span className="text-[#2a2a3e]">→</span>
                    <CompanyAvatar name={neg.buyer.name} initials={neg.buyer.logo_initials} color={neg.buyer.avatar_color} size="sm" />
                    <span className="text-xs text-[#64748b]">{neg.buyer.name}</span>
                    <span className="ml-auto text-xs text-[#64748b]">{neg.round_count} rounds</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-[#e2e8f0] flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-[#6366f1]" /> Live Activity
          </h2>
          <div className="bg-[#13131a] border border-[#1e1e2e] rounded-xl overflow-hidden">
            <div className="max-h-[480px] overflow-y-auto">
              {(activity || []).length === 0 && <p className="text-[#64748b] text-sm p-6 text-center">No activity yet</p>}
              {(activity || []).map((item, i) => (
                <div key={i} className="px-4 py-3 border-b border-[#1e1e2e] last:border-0 hover:bg-[#1a1a24] transition-colors">
                  <div className="flex gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#6366f1] mt-1.5 shrink-0" />
                    <div>
                      <p className="text-xs text-[#e2e8f0] leading-relaxed">{item.description}</p>
                      <p className="text-[10px] text-[#64748b] mt-0.5">{timeAgo(item.created_at)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
