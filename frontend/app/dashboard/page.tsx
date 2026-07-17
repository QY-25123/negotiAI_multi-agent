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
    <div className="bg-white border border-[#fce7f3] rounded-xl p-5 hover:border-[#fbcfe8] transition-colors shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-[#64748b] font-medium">{label}</p>
          <p className="text-3xl font-bold mt-1 text-[#1e293b]">{value}</p>
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
        <h1 className="text-3xl font-bold text-[#1e293b]">Dashboard</h1>
        <p className="text-[#64748b] mt-1">Monitor your AI deal platform</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Companies" value={String(stats?.total_companies ?? "—")} icon={Building2} color="#ec4899" sub="Registered on platform" />
        <StatCard label="AI Sessions" value={String(stats?.total_negotiations ?? "—")} icon={MessageSquare} color="#3b82f6" sub="All time" />
        <StatCard label="Deals Closed" value={String(stats?.completed_negotiations ?? "—")} icon={CheckCircle2} color="#22c55e" sub="Successful agreements" />
        <StatCard label="Value Closed" value={stats ? formatCurrency(stats.total_value_closed) : "—"} icon={DollarSign} color="#a855f7" sub="Total contract value" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Recent Deals */}
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#1e293b] flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#ec4899]" /> Recent Deals
            </h2>
            <Link href="/negotiations" className="text-sm text-[#ec4899] hover:text-[#db2777] transition-colors">View all →</Link>
          </div>
          <div className="space-y-3">
            {recent.length === 0 && <div className="bg-white border border-[#fce7f3] rounded-xl p-8 text-center text-[#64748b]">No deals yet</div>}
            {recent.map(neg => (
              <Link key={neg.id} href={`/negotiations/${neg.id}`}>
                <div className="bg-white border border-[#fce7f3] rounded-xl p-4 hover:border-[#fbcfe8] hover:bg-[#fef3f8] transition-all cursor-pointer group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ color: SERVICE_COLORS[neg.service_type], backgroundColor: `${SERVICE_COLORS[neg.service_type]}20` }}>
                        {SERVICE_LABELS[neg.service_type]}
                      </span>
                      <StatusBadge outcome={neg.outcome} status={neg.status} />
                    </div>
                    {neg.final_value && <span className="text-sm font-bold text-[#22c55e]">{formatCurrency(neg.final_value)}</span>}
                  </div>
                  <p className="text-sm font-medium text-[#1e293b] group-hover:text-[#ec4899] mb-2 truncate">{neg.title}</p>
                  <div className="flex items-center gap-2">
                    <CompanyAvatar name={neg.seller.name} initials={neg.seller.logo_initials} color={neg.seller.avatar_color} size="sm" />
                    <span className="text-xs text-[#64748b]">{neg.seller.name}</span>
                    <span className="text-[#fbcfe8]">→</span>
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
          <h2 className="text-lg font-semibold text-[#1e293b] flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-[#ec4899]" /> Live Activity
          </h2>
          <div className="bg-white border border-[#fce7f3] rounded-xl overflow-hidden shadow-sm">
            <div className="max-h-[480px] overflow-y-auto">
              {(activity || []).length === 0 && <p className="text-[#64748b] text-sm p-6 text-center">No activity yet</p>}
              {(activity || []).map((item, i) => (
                <div key={i} className="px-4 py-3 border-b border-[#fce7f3] last:border-0 hover:bg-[#fef3f8] transition-colors">
                  <div className="flex gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#ec4899] mt-1.5 shrink-0" />
                    <div>
                      <p className="text-xs text-[#1e293b] leading-relaxed">{item.description}</p>
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
