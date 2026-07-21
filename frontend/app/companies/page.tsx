"use client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api, Company } from "@/lib/api";
import { timeAgo } from "@/lib/utils";
import { CompanyAvatar } from "@/components/ui/CompanyAvatar";
import { useAuth } from "@/context/AuthContext";
import { X, Briefcase, Globe, LayoutList, Handshake } from "lucide-react";

const TYPE_COLORS: Record<string, { label: string; color: string; bg: string }> = {
  organizer: { label: "Organizer", color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
  sponsor:   { label: "Sponsor",   color: "#10b981", bg: "rgba(16,185,129,0.12)" },
  both:      { label: "Both",      color: "#a855f7", bg: "rgba(168,85,247,0.12)" },
};

function getOppositeTypes(myType: string): string[] {
  if (myType === "sponsor") return ["organizer", "both"];
  if (myType === "organizer") return ["sponsor", "both"];
  return ["organizer", "sponsor", "both"];
}

function CompanyDetailModal({ company: co, onClose }: { company: Company; onClose: () => void }) {
  const tc = TYPE_COLORS[co.type] || TYPE_COLORS.both;
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white border border-[#fce7f3] rounded-2xl w-full max-w-lg shadow-xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-[#fce7f3]">
          <div className="flex items-center gap-4">
            <CompanyAvatar name={co.name} initials={co.logo_initials} color={co.avatar_color} size="lg" />
            <div>
              <h2 className="text-lg font-bold text-[#1e293b]">{co.name}</h2>
              <p className="text-xs text-[#64748b] mt-0.5">{co.industry}</p>
              <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full mt-1.5"
                style={{ color: tc.color, backgroundColor: tc.bg }}>{tc.label}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#fef3f8] transition-colors shrink-0 ml-2">
            <X className="w-4 h-4 text-[#64748b]" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Description */}
          <p className="text-sm text-[#475569] leading-relaxed">{co.description}</p>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-[#f8fafc] border border-[#e2e8f0]">
              <div className="flex items-center gap-1.5 mb-1">
                <LayoutList className="w-3.5 h-3.5 text-[#64748b]" />
                <p className="text-[10px] font-medium text-[#64748b] uppercase tracking-wide">Listings</p>
              </div>
              <p className="text-2xl font-bold text-[#1e293b]">{co.listing_count ?? 0}</p>
            </div>
            <div className="p-3 rounded-xl bg-[#f8fafc] border border-[#e2e8f0]">
              <div className="flex items-center gap-1.5 mb-1">
                <Handshake className="w-3.5 h-3.5 text-[#64748b]" />
                <p className="text-[10px] font-medium text-[#64748b] uppercase tracking-wide">Deals</p>
              </div>
              <p className="text-2xl font-bold text-[#1e293b]">{co.negotiation_count ?? 0}</p>
            </div>
          </div>

          {/* Extra fields */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-[#64748b]">
              <Briefcase className="w-3.5 h-3.5 shrink-0" />
              <span>{co.industry}</span>
            </div>
            {co.website && (
              <div className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-[#64748b] shrink-0" />
                <a href={co.website} target="_blank" rel="noopener noreferrer"
                  className="text-[#ec4899] hover:underline truncate">{co.website}</a>
              </div>
            )}
          </div>

          <p className="text-xs text-[#94a3b8]">Member since {timeAgo(co.created_at)}</p>
        </div>
      </div>
    </div>
  );
}

export default function Companies() {
  const { company: myCompany } = useAuth();
  const [selected, setSelected] = useState<Company | null>(null);
  const { data: companies, isLoading } = useQuery({ queryKey: ["companies"], queryFn: api.companies.list });

  const visibleTypes = myCompany ? getOppositeTypes(myCompany.type) : ["organizer", "sponsor", "both"];
  const filtered = (companies || []).filter(co => visibleTypes.includes(co.type));

  const title = myCompany?.type === "sponsor"
    ? "Organizers"
    : myCompany?.type === "organizer"
    ? "Sponsors"
    : "Partners";

  const subtitle = myCompany?.type === "sponsor"
    ? "Event organizers looking for sponsorship"
    : myCompany?.type === "organizer"
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
              <div key={co.id}
                className="bg-white border border-[#fce7f3] rounded-xl p-5 hover:border-[#fbcfe8] hover:bg-[#fef3f8] transition-all shadow-sm cursor-pointer"
                onClick={() => setSelected(co)}
              >
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

      {selected && <CompanyDetailModal company={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
