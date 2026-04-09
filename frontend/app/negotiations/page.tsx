"use client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { formatCurrency, timeAgo, SERVICE_COLORS, SERVICE_LABELS } from "@/lib/utils";
import { CompanyAvatar } from "@/components/ui/CompanyAvatar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
  { key: "failed", label: "Failed" },
];

export default function Negotiations() {
  const [statusFilter, setStatusFilter] = useState("all");
  const { data: negotiations, isLoading } = useQuery({
    queryKey: ["negotiations", statusFilter],
    queryFn: () => api.negotiations.list(statusFilter !== "all" ? { status: statusFilter } : undefined),
    refetchInterval: 15000,
  });

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#e2e8f0]">Negotiations</h1>
        <p className="text-[#64748b] mt-1">Track all AI-powered deal negotiations</p>
      </div>
      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setStatusFilter(f.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${statusFilter === f.key ? "bg-[#6366f1] text-white" : "bg-[#13131a] border border-[#1e1e2e] text-[#64748b] hover:text-[#e2e8f0]"}`}>
            {f.label}
          </button>
        ))}
      </div>
      {isLoading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="bg-[#13131a] border border-[#1e1e2e] rounded-xl h-24 animate-pulse" />)}</div>
      ) : (
        <div className="space-y-3">
          {(negotiations || []).length === 0 && <p className="text-center text-[#64748b] py-16">No negotiations found</p>}
          {(negotiations || []).map(neg => (
            <Link key={neg.id} href={`/negotiations/${neg.id}`}>
              <div className={`bg-[#13131a] border rounded-xl p-5 hover:bg-[#1a1a24] transition-all cursor-pointer group
                ${neg.status === "active" ? "border-[#6366f1]/50" : "border-[#1e1e2e] hover:border-[#2a2a3e]"}`}>
                <div className="flex items-center gap-4">
                  {/* Service type accent */}
                  <div className="w-1 h-14 rounded-full shrink-0" style={{ backgroundColor: SERVICE_COLORS[neg.service_type] }} />
                  {/* Parties */}
                  <div className="flex items-center gap-2 shrink-0">
                    <CompanyAvatar name={neg.seller.name} initials={neg.seller.logo_initials} color={neg.seller.avatar_color} size="sm" />
                    <span className="text-[#2a2a3e] text-lg">→</span>
                    <CompanyAvatar name={neg.buyer.name} initials={neg.buyer.logo_initials} color={neg.buyer.avatar_color} size="sm" />
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium" style={{ color: SERVICE_COLORS[neg.service_type] }}>{SERVICE_LABELS[neg.service_type]}</span>
                      {neg.status === "active" && <span className="flex items-center gap-1 text-xs text-[#f59e0b]"><span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] animate-pulse" />Live</span>}
                    </div>
                    <p className="text-sm font-semibold text-[#e2e8f0] group-hover:text-white truncate">{neg.title}</p>
                    <p className="text-xs text-[#64748b] mt-0.5">{neg.seller.name} → {neg.buyer.name} · {neg.round_count}/{neg.max_rounds} rounds · {timeAgo(neg.created_at)}</p>
                  </div>
                  {/* Right side */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <StatusBadge outcome={neg.outcome} status={neg.status} />
                      {neg.final_value && <p className="text-sm font-bold text-[#22c55e] mt-1">{formatCurrency(neg.final_value)}</p>}
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#64748b] group-hover:text-[#e2e8f0] transition-colors" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
