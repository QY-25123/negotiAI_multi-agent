"use client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api, ServiceListing } from "@/lib/api";
import { formatCurrency, SERVICE_COLORS, SERVICE_LABELS } from "@/lib/utils";
import { CompanyAvatar } from "@/components/ui/CompanyAvatar";
import { Megaphone, Users, Banknote, MapPin, ArrowRight, X, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

const SERVICE_ICONS: Record<string, React.ElementType> = { advertising: Megaphone, staffing: Users, sponsorship: Banknote };
const FILTERS = ["all", "advertising", "staffing", "sponsorship"];

function ListingCard({ listing, onSelect }: { listing: ServiceListing; onSelect: () => void }) {
  const Icon = SERVICE_ICONS[listing.service_type] || Megaphone;
  const color = SERVICE_COLORS[listing.service_type];

  return (
    <div className="bg-[#13131a] border border-[#1e1e2e] rounded-xl p-5 hover:border-[#2a2a3e] hover:bg-[#1a1a24] transition-all flex flex-col group cursor-pointer" onClick={onSelect}>
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}20` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        {listing.company && (
          <CompanyAvatar name={listing.company.name} initials={listing.company.logo_initials} color={listing.company.avatar_color} size="sm" />
        )}
      </div>
      <span className="text-xs font-medium mb-2" style={{ color }}>
        {SERVICE_LABELS[listing.service_type]}
      </span>
      <h3 className="text-base font-semibold text-[#e2e8f0] group-hover:text-white mb-1 line-clamp-2">{listing.title}</h3>
      <p className="text-xs text-[#64748b] mb-3 line-clamp-2">{listing.description}</p>
      {listing.company && <p className="text-xs text-[#94a3b8] mb-3">{listing.company.name} · {listing.company.industry}</p>}
      <div className="mt-auto space-y-2">
        {(listing.min_price || listing.max_price) && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#64748b]">Price range</span>
            <span className="text-sm font-bold text-[#e2e8f0]">
              {listing.min_price ? formatCurrency(listing.min_price) : "—"}
              {listing.max_price ? ` – ${formatCurrency(listing.max_price)}` : ""}
            </span>
          </div>
        )}
        {listing.location && (
          <div className="flex items-center gap-1 text-xs text-[#64748b]">
            <MapPin className="w-3 h-3" /> {listing.location}
          </div>
        )}
        <button className="w-full mt-2 py-2 rounded-lg text-sm font-medium border border-[#6366f1]/40 text-[#818cf8] hover:bg-[#6366f1]/20 hover:text-white transition-all flex items-center justify-center gap-2">
          View & Negotiate <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function StartModal({ listing, onClose }: { listing: ServiceListing; onClose: () => void }) {
  const { data: companies } = useQuery({ queryKey: ["companies"], queryFn: api.companies.list });
  const router = useRouter();
  const [form, setForm] = useState({ buyer_company_id: "", max_budget_per_unit: "", preferred_duration_days: "21", start_date: "2026-04-07" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // exclude the listing's own company
  const buyers = (companies || []).filter(c => c.id !== listing.company_id && (c.type === "buyer" || c.type === "both"));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.buyer_company_id || !form.max_budget_per_unit) { setError("Please fill all required fields"); return; }
    setLoading(true); setError("");
    try {
      const res = await api.negotiations.start({
        listing_id: listing.id,
        buyer_company_id: form.buyer_company_id,
        max_budget_per_unit: parseFloat(form.max_budget_per_unit),
        preferred_duration_days: parseInt(form.preferred_duration_days),
        start_date: form.start_date,
      });
      router.push(`/negotiations/${res.negotiation_id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to start negotiation";
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#13131a] border border-[#2a2a3e] rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-[#e2e8f0]">Start AI Negotiation</h2>
            <p className="text-xs text-[#64748b] mt-0.5 truncate max-w-[280px]">{listing.title}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#2a2a3e] transition-colors"><X className="w-4 h-4 text-[#64748b]" /></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-[#94a3b8] block mb-1.5">Buyer Company *</label>
            <select className="w-full bg-[#0d0d14] border border-[#2a2a3e] rounded-lg px-3 py-2.5 text-sm text-[#e2e8f0] focus:outline-none focus:border-[#6366f1]"
              value={form.buyer_company_id} onChange={e => setForm(f => ({ ...f, buyer_company_id: e.target.value }))} required>
              <option value="">Select company...</option>
              {buyers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-[#94a3b8] block mb-1.5">Max Budget (per unit/day) *</label>
            <input type="number" className="w-full bg-[#0d0d14] border border-[#2a2a3e] rounded-lg px-3 py-2.5 text-sm text-[#e2e8f0] focus:outline-none focus:border-[#6366f1]"
              placeholder="e.g. 50" value={form.max_budget_per_unit} onChange={e => setForm(f => ({ ...f, max_budget_per_unit: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[#94a3b8] block mb-1.5">Duration (days)</label>
              <input type="number" className="w-full bg-[#0d0d14] border border-[#2a2a3e] rounded-lg px-3 py-2.5 text-sm text-[#e2e8f0] focus:outline-none focus:border-[#6366f1]"
                value={form.preferred_duration_days} onChange={e => setForm(f => ({ ...f, preferred_duration_days: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-[#94a3b8] block mb-1.5">Start Date</label>
              <input type="date" className="w-full bg-[#0d0d14] border border-[#2a2a3e] rounded-lg px-3 py-2.5 text-sm text-[#e2e8f0] focus:outline-none focus:border-[#6366f1]"
                value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
            </div>
          </div>
          {error && <p className="text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-lg bg-[#6366f1] hover:bg-[#5558e8] text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Launching agents...</> : "🤖 Launch AI Negotiation →"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Marketplace() {
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<ServiceListing | null>(null);
  const { data: listings, isLoading } = useQuery({
    queryKey: ["listings", filter],
    queryFn: () => api.listings.list(filter === "all" ? undefined : filter),
  });

  return (
    <div className="p-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#e2e8f0]">Marketplace</h1>
        <p className="text-[#64748b] mt-1">Browse available services and launch AI negotiations</p>
      </div>
      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${filter === f
                ? f === "all" ? "bg-[#6366f1] text-white" : "text-white"
                : "bg-[#13131a] border border-[#1e1e2e] text-[#64748b] hover:text-[#e2e8f0] hover:border-[#2a2a3e]"
              }`}
            style={filter === f && f !== "all" ? { backgroundColor: SERVICE_COLORS[f] } : undefined}
          >
            {f === "all" ? "All Services" : SERVICE_LABELS[f]}
          </button>
        ))}
      </div>
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="bg-[#13131a] border border-[#1e1e2e] rounded-xl h-64 animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(listings || []).map(l => <ListingCard key={l.id} listing={l} onSelect={() => setSelected(l)} />)}
          {listings?.length === 0 && <p className="col-span-3 text-center text-[#64748b] py-16">No listings found</p>}
        </div>
      )}
      {selected && <StartModal listing={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
