"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/utils";
import { CompanyAvatar } from "@/components/ui/CompanyAvatar";
import Link from "next/link";

const TYPE_COLORS: Record<string, { label: string; color: string; bg: string }> = {
  seller: { label: "Seller", color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
  buyer: { label: "Buyer", color: "#10b981", bg: "rgba(16,185,129,0.12)" },
  both: { label: "Both", color: "#8b5cf6", bg: "rgba(139,92,246,0.12)" },
};

export default function Companies() {
  const { data: companies, isLoading } = useQuery({ queryKey: ["companies"], queryFn: api.companies.list });

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#e2e8f0]">Companies</h1>
          <p className="text-[#64748b] mt-1">All registered marketplace participants</p>
        </div>
        <Link href="/register" className="px-4 py-2 bg-[#6366f1] hover:bg-[#5558e8] text-white rounded-lg text-sm font-medium transition-colors">
          + Register Company
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="bg-[#13131a] border border-[#1e1e2e] rounded-xl h-48 animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(companies || []).map(co => {
            const tc = TYPE_COLORS[co.type] || TYPE_COLORS.both;
            return (
              <div key={co.id} className="bg-[#13131a] border border-[#1e1e2e] rounded-xl p-5 hover:border-[#2a2a3e] hover:bg-[#1a1a24] transition-all group">
                <div className="flex items-start gap-3 mb-3">
                  <CompanyAvatar name={co.name} initials={co.logo_initials} color={co.avatar_color} size="lg" />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-[#e2e8f0] group-hover:text-white truncate">{co.name}</h3>
                    <p className="text-xs text-[#64748b] mt-0.5">{co.industry}</p>
                    <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full mt-1.5"
                      style={{ color: tc.color, backgroundColor: tc.bg }}>{tc.label}</span>
                  </div>
                </div>
                <p className="text-xs text-[#64748b] line-clamp-2 mb-4">{co.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex gap-3 text-xs text-[#64748b]">
                    <span>{co.listing_count ?? 0} listings</span>
                    <span>·</span>
                    <span>{co.negotiation_count ?? 0} deals</span>
                  </div>
                  <span className="text-xs text-[#64748b]">{timeAgo(co.created_at)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
