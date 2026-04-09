"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api, ServiceListing } from "@/lib/api";
import { formatCurrency, SERVICE_COLORS, SERVICE_LABELS } from "@/lib/utils";
import { CompanyAvatar } from "@/components/ui/CompanyAvatar";
import { Megaphone, Users, Banknote, MapPin, ArrowRight, X, Loader2, Plus } from "lucide-react";
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
  const [form, setForm] = useState({
    buyer_company_id: "",
    target_price_per_unit: "",
    max_budget_per_unit: "",
    preferred_duration_days: "21",
    start_date: "2026-04-07",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // exclude the listing's own company
  const buyers = (companies || []).filter(c => c.id !== listing.company_id && (c.type === "buyer" || c.type === "both"));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.buyer_company_id || !form.max_budget_per_unit) { setError("Please fill all required fields"); return; }
    const target = form.target_price_per_unit ? parseFloat(form.target_price_per_unit) : undefined;
    const max = parseFloat(form.max_budget_per_unit);
    if (target !== undefined && target >= max) { setError("Target price must be lower than max budget"); return; }
    setLoading(true); setError("");
    try {
      const res = await api.negotiations.start({
        listing_id: listing.id,
        buyer_company_id: form.buyer_company_id,
        target_price_per_unit: target,
        max_budget_per_unit: max,
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

  // Show seller's price range from listing if available
  const sellerRange = listing.min_price || listing.max_price
    ? `Seller range: ${listing.min_price ? `$${listing.min_price}` : "—"} – ${listing.max_price ? `$${listing.max_price}` : "—"}/day`
    : null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#13131a] border border-[#2a2a3e] rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-[#e2e8f0]">Start AI Negotiation</h2>
            <p className="text-xs text-[#64748b] mt-0.5 truncate max-w-[280px]">{listing.title}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#2a2a3e] transition-colors"><X className="w-4 h-4 text-[#64748b]" /></button>
        </div>
        {sellerRange && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-[#6366f1]/10 border border-[#6366f1]/20 text-xs text-[#818cf8]">
            {sellerRange}
          </div>
        )}
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-[#94a3b8] block mb-1.5">Buyer Company *</label>
            <select className="w-full bg-[#0d0d14] border border-[#2a2a3e] rounded-lg px-3 py-2.5 text-sm text-[#e2e8f0] focus:outline-none focus:border-[#6366f1]"
              value={form.buyer_company_id} onChange={e => setForm(f => ({ ...f, buyer_company_id: e.target.value }))} required>
              <option value="">Select company...</option>
              {buyers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {/* Price range — target (opening offer) → max (ceiling) */}
          <div>
            <label className="text-xs font-medium text-[#94a3b8] block mb-1.5">Your Price Range (per unit/day)</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <input type="number" min="0" step="0.01"
                  className="w-full bg-[#0d0d14] border border-[#2a2a3e] rounded-lg px-3 py-2.5 text-sm text-[#e2e8f0] focus:outline-none focus:border-[#6366f1]"
                  placeholder="Target price" value={form.target_price_per_unit}
                  onChange={e => setForm(f => ({ ...f, target_price_per_unit: e.target.value }))} />
                <p className="text-[10px] text-[#64748b] mt-1">Opening offer</p>
              </div>
              <div>
                <input type="number" min="0" step="0.01"
                  className="w-full bg-[#0d0d14] border border-[#2a2a3e] rounded-lg px-3 py-2.5 text-sm text-[#e2e8f0] focus:outline-none focus:border-[#6366f1]"
                  placeholder="Max budget *" value={form.max_budget_per_unit}
                  onChange={e => setForm(f => ({ ...f, max_budget_per_unit: e.target.value }))} required />
                <p className="text-[10px] text-[#64748b] mt-1">Hard ceiling *</p>
              </div>
            </div>
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

function CreateListingModal({ onClose }: { onClose: () => void }) {
  const { data: companies } = useQuery({ queryKey: ["companies"], queryFn: api.companies.list });
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    company_id: "", service_type: "advertising", title: "",
    description: "", min_price: "", max_price: "", location: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const sellers = (companies || []).filter(c => c.type === "seller" || c.type === "both");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.company_id || !form.title) { setError("Company and title are required"); return; }
    setLoading(true); setError("");
    try {
      await api.listings.create({
        company_id: form.company_id,
        service_type: form.service_type,
        title: form.title,
        description: form.description,
        min_price: form.min_price ? parseFloat(form.min_price) : undefined,
        max_price: form.max_price ? parseFloat(form.max_price) : undefined,
        location: form.location || undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ["listings"] });
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create listing");
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-[#13131a] border border-[#2a2a3e] rounded-2xl p-8 w-full max-w-sm shadow-2xl text-center" onClick={e => e.stopPropagation()}>
          <div className="w-14 h-14 rounded-full bg-[#22c55e]/20 flex items-center justify-center mx-auto mb-4">
            <Megaphone className="w-7 h-7 text-[#22c55e]" />
          </div>
          <h2 className="text-lg font-bold text-[#e2e8f0] mb-2">Listing Published!</h2>
          <p className="text-sm text-[#64748b] mb-6">Your service is now visible in the marketplace.</p>
          <button onClick={onClose} className="w-full py-2.5 bg-[#6366f1] hover:bg-[#5558e8] text-white rounded-lg text-sm font-medium transition-colors">
            View Marketplace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#13131a] border border-[#2a2a3e] rounded-2xl p-6 w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-[#e2e8f0]">Post a Listing</h2>
            <p className="text-xs text-[#64748b] mt-0.5">Publish your service to the marketplace</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#2a2a3e] transition-colors"><X className="w-4 h-4 text-[#64748b]" /></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-[#94a3b8] block mb-1.5">Your Company (Seller) *</label>
            <select className="w-full bg-[#0d0d14] border border-[#2a2a3e] rounded-lg px-3 py-2.5 text-sm text-[#e2e8f0] focus:outline-none focus:border-[#6366f1]"
              value={form.company_id} onChange={e => setForm(f => ({ ...f, company_id: e.target.value }))} required>
              <option value="">Select company...</option>
              {sellers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.industry})</option>)}
            </select>
            {sellers.length === 0 && (
              <p className="text-xs text-[#f59e0b] mt-1">No seller companies found. <a href="/register" className="underline">Register one first.</a></p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[#94a3b8] block mb-1.5">Service Type *</label>
              <select className="w-full bg-[#0d0d14] border border-[#2a2a3e] rounded-lg px-3 py-2.5 text-sm text-[#e2e8f0] focus:outline-none focus:border-[#6366f1]"
                value={form.service_type} onChange={e => setForm(f => ({ ...f, service_type: e.target.value }))}>
                <option value="advertising">Advertising</option>
                <option value="staffing">Staffing</option>
                <option value="sponsorship">Sponsorship</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-[#94a3b8] block mb-1.5">Location</label>
              <input className="w-full bg-[#0d0d14] border border-[#2a2a3e] rounded-lg px-3 py-2.5 text-sm text-[#e2e8f0] focus:outline-none focus:border-[#6366f1]"
                placeholder="e.g. New York, NY" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-[#94a3b8] block mb-1.5">Listing Title *</label>
            <input className="w-full bg-[#0d0d14] border border-[#2a2a3e] rounded-lg px-3 py-2.5 text-sm text-[#e2e8f0] focus:outline-none focus:border-[#6366f1]"
              placeholder="e.g. Premium Billboard — Downtown Core" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
          </div>
          <div>
            <label className="text-xs font-medium text-[#94a3b8] block mb-1.5">Description</label>
            <textarea className="w-full bg-[#0d0d14] border border-[#2a2a3e] rounded-lg px-3 py-2.5 text-sm text-[#e2e8f0] focus:outline-none focus:border-[#6366f1] resize-none"
              rows={3} placeholder="Describe what you're offering..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[#94a3b8] block mb-1.5">Min Price (per unit/day)</label>
              <input type="number" min="0" className="w-full bg-[#0d0d14] border border-[#2a2a3e] rounded-lg px-3 py-2.5 text-sm text-[#e2e8f0] focus:outline-none focus:border-[#6366f1]"
                placeholder="e.g. 30" value={form.min_price} onChange={e => setForm(f => ({ ...f, min_price: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-[#94a3b8] block mb-1.5">Max Price (per unit/day)</label>
              <input type="number" min="0" className="w-full bg-[#0d0d14] border border-[#2a2a3e] rounded-lg px-3 py-2.5 text-sm text-[#e2e8f0] focus:outline-none focus:border-[#6366f1]"
                placeholder="e.g. 100" value={form.max_price} onChange={e => setForm(f => ({ ...f, max_price: e.target.value }))} />
            </div>
          </div>
          {error && <p className="text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-lg bg-[#6366f1] hover:bg-[#5558e8] text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Publishing...</> : "Publish Listing →"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Marketplace() {
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<ServiceListing | null>(null);
  const [creating, setCreating] = useState(false);
  const { data: listings, isLoading } = useQuery({
    queryKey: ["listings", filter],
    queryFn: () => api.listings.list(filter === "all" ? undefined : filter),
  });

  return (
    <div className="p-8 max-w-7xl">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#e2e8f0]">Marketplace</h1>
          <p className="text-[#64748b] mt-1">Browse available services and launch AI negotiations</p>
        </div>
        <button onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#6366f1] hover:bg-[#5558e8] text-white rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Post a Listing
        </button>
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
      {creating && <CreateListingModal onClose={() => setCreating(false)} />}
    </div>
  );
}
