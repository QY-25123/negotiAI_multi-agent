"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/utils";
import { CompanyAvatar } from "@/components/ui/CompanyAvatar";
import { useAuth } from "@/context/AuthContext";

const TYPE_COLORS: Record<string, { label: string; color: string; bg: string }> = {
  seller: { label: "Organizer", color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
  buyer: { label: "Sponsor", color: "#10b981", bg: "rgba(16,185,129,0.12)" },
  both: { label: "Both", color: "#a855f7", bg: "rgba(168,85,247,0.12)" },
};

function getOppositeTypes(myType: string): string[] {
  if (myType === "buyer") return ["seller", "both"];
  if (myType === "seller") return ["buyer", "both"];
  return ["seller", "buyer", "both"];
}

export default function Companies() {
  const { company: myCompany } = useAuth();
  const { data: companies, isLoading } = useQuery({ queryKey: ["companies"], queryFn: api.companies.list });

  const visibleTypes = myCompany ? getOppositeTypes(myCompany.type) : ["seller", "buyer", "both"];
  const filtered = (companies || []).filter(co => visibleTypes.includes(co.type));

  const title = myCompany?.type === "buyer"
    ? "Organizers"
    : myCompany?.type === "seller"
    ? "Sponsors"
    : "Partners";

  const subtitle = myCompany?.type === "buyer"
    ? "Event organizers looking for sponsorship"
    : myCompany?.type === "seller"
    ? "Companies looking to sponsor events"
    : "All registered event marketplace participants";

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#1e293b]">{title}</h1>
        <p className="text-[#64748b] mt-1">{subtitle}</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="bg-white border border-[#fce7f3] rounded-xl h-48 animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(co => {
            const tc = TYPE_COLORS[co.type] || TYPE_COLORS.both;
            return (
              <div key={co.id} className="bg-white border border-[#fce7f3] rounded-xl p-5 hover:border-[#fbcfe8] hover:bg-[#fef3f8] transition-all group shadow-sm">
                <div className="flex items-start gap-3 mb-3">
                  <CompanyAvatar name={co.name} initials={co.logo_initials} color={co.avatar_color} size="lg" />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-[#1e293b] truncate">{co.name}</h3>
                    <p className="text-xs text-[#475569] mt-0.5">{co.industry}</p>
                    <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full mt-1.5"
                      style={{ color: tc.color, backgroundColor: tc.bg }}>{tc.label}</span>
                  </div>
                </div>
                <p className="text-xs text-[#475569] line-clamp-2 mb-4">{co.description}</p>
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
