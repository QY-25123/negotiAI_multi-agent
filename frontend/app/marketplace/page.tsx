"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api, ServiceListing } from "@/lib/api";
import { formatCurrency, SERVICE_COLORS, SERVICE_LABELS } from "@/lib/utils";
import { CompanyAvatar } from "@/components/ui/CompanyAvatar";
import { Megaphone, Users, Banknote, MapPin, ArrowRight, X, Loader2, Plus, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const SERVICE_ICONS: Record<string, React.ElementType> = { advertising: Megaphone, staffing: Users, sponsorship: Banknote };
const FILTERS = ["all", "advertising", "staffing", "sponsorship"];

function ListingCard({ listing, onSelect, canNegotiate, isOwn }: {
  listing: ServiceListing; onSelect: () => void; canNegotiate: boolean; isOwn: boolean;
}) {
  const Icon = SERVICE_ICONS[listing.service_type] || Megaphone;
  const color = SERVICE_COLORS[listing.service_type];

  return (
    <div className={`bg-white border rounded-xl p-5 transition-all flex flex-col group shadow-sm
      ${isOwn ? "border-[#ec4899]/40 hover:border-[#ec4899]/70" : "border-[#fce7f3] hover:border-[#fbcfe8] hover:bg-[#fef3f8]"}
      ${canNegotiate ? "cursor-pointer" : ""}`}
      onClick={canNegotiate ? onSelect : undefined}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}20` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <div className="flex items-center gap-1.5">
          {isOwn && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#ec4899]/10 text-[#ec4899]">Yours</span>
          )}
          {listing.company && (
            <CompanyAvatar name={listing.company.name} initials={listing.company.logo_initials} color={listing.company.avatar_color} size="sm" />
          )}
        </div>
      </div>
      <span className="text-xs font-medium mb-2" style={{ color }}>
        {SERVICE_LABELS[listing.service_type]}
      </span>
      <h3 className="text-base font-semibold text-[#1e293b] mb-1 line-clamp-2">{listing.title}</h3>
      <p className="text-xs text-[#475569] mb-3 line-clamp-2">{listing.description}</p>
      {listing.company && <p className="text-xs text-[#64748b] mb-3">{listing.company.name} · {listing.company.industry}</p>}
      <div className="mt-auto space-y-2">
        {(listing.min_price || listing.max_price) && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#64748b]">Price range</span>
            <span className="text-sm font-bold text-[#1e293b]">
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
        {canNegotiate ? (
          <button className="w-full mt-2 py-2 rounded-lg text-sm font-medium border border-[#ec4899]/40 text-[#ec4899] hover:bg-[#ec4899]/10 hover:text-[#db2777] transition-all flex items-center justify-center gap-2">
            View & Match <ArrowRight className="w-4 h-4" />
          </button>
        ) : isOwn ? (
          <div className="w-full mt-2 py-2 rounded-lg text-sm font-medium border border-[#ec4899]/20 text-[#64748b] flex items-center justify-center gap-2">
            Your listing
          </div>
        ) : (
          <div className="w-full mt-2 py-2 rounded-lg text-sm font-medium border border-[#fce7f3] text-[#64748b] flex items-center justify-center gap-2">
            <Lock className="w-3.5 h-3.5" /> Organizers cannot sponsor
          </div>
        )}
      </div>
    </div>
  );
}

function StartModal({ listing, onClose }: { listing: ServiceListing; onClose: () => void }) {
  const { company: authCompany } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    buyer_company_id: authCompany?.id || "",
    target_price_per_unit: "",
    max_budget_per_unit: "",
    preferred_duration_days: "21",
    start_date: "2026-04-07",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      const msg = err instanceof Error ? err.message : "Failed to start session";
      setError(msg);
      setLoading(false);
    }
  };

  const sellerRange = listing.min_price || listing.max_price
    ? `Seller range: ${listing.min_price ? `$${listing.min_price}` : "—"} – ${listing.max_price ? `$${listing.max_price}` : "—"}/day`
    : null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white border border-[#fce7f3] rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-[#1e293b]">Start AI Session</h2>
            <p className="text-xs text-[#64748b] mt-0.5 truncate max-w-[280px]">{listing.title}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#fef3f8] transition-colors"><X className="w-4 h-4 text-[#64748b]" /></button>
        </div>
        {sellerRange && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-[#ec4899]/10 border border-[#ec4899]/20 text-xs text-[#ec4899]">
            {sellerRange}
          </div>
        )}
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-[#475569] block mb-1.5">Sponsoring as</label>
            <div className="w-full bg-[#fef3f8] border border-[#fce7f3] rounded-lg px-3 py-2.5 text-sm text-[#1e293b] flex items-center gap-2">
              {authCompany && (
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0"
                  style={{ backgroundColor: authCompany.avatar_color }}>
                  {authCompany.logo_initials}
                </div>
              )}
              {authCompany?.name ?? "Your company"}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-[#475569] block mb-1.5">Your Price Range (per unit/day)</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <input type="number" min="0" step="0.01"
                  className="w-full bg-[#fef3f8] border border-[#fce7f3] rounded-lg px-3 py-2.5 text-sm text-[#1e293b] focus:outline-none focus:border-[#ec4899]"
                  placeholder="Target price" value={form.target_price_per_unit}
                  onChange={e => setForm(f => ({ ...f, target_price_per_unit: e.target.value }))} />
                <p className="text-[10px] text-[#64748b] mt-1">Opening offer</p>
              </div>
              <div>
                <input type="number" min="0" step="0.01"
                  className="w-full bg-[#fef3f8] border border-[#fce7f3] rounded-lg px-3 py-2.5 text-sm text-[#1e293b] focus:outline-none focus:border-[#ec4899]"
                  placeholder="Max budget *" value={form.max_budget_per_unit}
                  onChange={e => setForm(f => ({ ...f, max_budget_per_unit: e.target.value }))} required />
                <p className="text-[10px] text-[#64748b] mt-1">Hard ceiling *</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[#475569] block mb-1.5">Duration (days)</label>
              <input type="number" className="w-full bg-[#fef3f8] border border-[#fce7f3] rounded-lg px-3 py-2.5 text-sm text-[#1e293b] focus:outline-none focus:border-[#ec4899]"
                value={form.preferred_duration_days} onChange={e => setForm(f => ({ ...f, preferred_duration_days: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-[#475569] block mb-1.5">Start Date</label>
              <input type="date" className="w-full bg-[#fef3f8] border border-[#fce7f3] rounded-lg px-3 py-2.5 text-sm text-[#1e293b] focus:outline-none focus:border-[#ec4899]"
                value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
            </div>
          </div>
          {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-lg bg-[#ec4899] hover:bg-[#db2777] text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Launching agents...</> : "🤖 Launch AI Session →"}
          </button>
        </form>
      </div>
    </div>
  );
}

function CreateListingModal({ onClose }: { onClose: () => void }) {
  const { company: authCompany } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    company_id: authCompany?.id || "", service_type: "advertising", title: "",
    description: "", min_price: "", max_price: "", location: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

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
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-white border border-[#fce7f3] rounded-2xl p-8 w-full max-w-sm shadow-xl text-center" onClick={e => e.stopPropagation()}>
          <div className="w-14 h-14 rounded-full bg-[#22c55e]/20 flex items-center justify-center mx-auto mb-4">
            <Megaphone className="w-7 h-7 text-[#22c55e]" />
          </div>
          <h2 className="text-lg font-bold text-[#1e293b] mb-2">Listing Published!</h2>
          <p className="text-sm text-[#64748b] mb-6">Your service is now visible in the marketplace.</p>
          <button onClick={onClose} className="w-full py-2.5 bg-[#ec4899] hover:bg-[#db2777] text-white rounded-lg text-sm font-medium transition-colors">
            View Marketplace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white border border-[#fce7f3] rounded-2xl p-6 w-full max-w-lg shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-[#1e293b]">Post a Listing</h2>
            <p className="text-xs text-[#64748b] mt-0.5">Publish your service to the marketplace</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#fef3f8] transition-colors"><X className="w-4 h-4 text-[#64748b]" /></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-[#475569] block mb-1.5">Posting as</label>
            <div className="w-full bg-[#fef3f8] border border-[#fce7f3] rounded-lg px-3 py-2.5 text-sm text-[#1e293b] flex items-center gap-2">
              {authCompany && (
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0"
                  style={{ backgroundColor: authCompany.avatar_color }}>
                  {authCompany.logo_initials}
                </div>
              )}
              {authCompany?.name ?? "Your company"}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[#475569] block mb-1.5">Service Type *</label>
              <select className="w-full bg-[#fef3f8] border border-[#fce7f3] rounded-lg px-3 py-2.5 text-sm text-[#1e293b] focus:outline-none focus:border-[#ec4899]"
                value={form.service_type} onChange={e => setForm(f => ({ ...f, service_type: e.target.value }))}>
                <option value="advertising">Advertising</option>
                <option value="staffing">Staffing</option>
                <option value="sponsorship">Sponsorship</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-[#475569] block mb-1.5">Location</label>
              <input className="w-full bg-[#fef3f8] border border-[#fce7f3] rounded-lg px-3 py-2.5 text-sm text-[#1e293b] focus:outline-none focus:border-[#ec4899]"
                placeholder="e.g. New York, NY" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-[#475569] block mb-1.5">Listing Title *</label>
            <input className="w-full bg-[#fef3f8] border border-[#fce7f3] rounded-lg px-3 py-2.5 text-sm text-[#1e293b] focus:outline-none focus:border-[#ec4899]"
              placeholder="e.g. Premium Billboard — Downtown Core" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
          </div>
          <div>
            <label className="text-xs font-medium text-[#475569] block mb-1.5">Description</label>
            <textarea className="w-full bg-[#fef3f8] border border-[#fce7f3] rounded-lg px-3 py-2.5 text-sm text-[#1e293b] focus:outline-none focus:border-[#ec4899] resize-none"
              rows={3} placeholder="Describe what you're offering..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[#475569] block mb-1.5">Min Price (per unit/day)</label>
              <input type="number" min="0" className="w-full bg-[#fef3f8] border border-[#fce7f3] rounded-lg px-3 py-2.5 text-sm text-[#1e293b] focus:outline-none focus:border-[#ec4899]"
                placeholder="e.g. 30" value={form.min_price} onChange={e => setForm(f => ({ ...f, min_price: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-[#475569] block mb-1.5">Max Price (per unit/day)</label>
              <input type="number" min="0" className="w-full bg-[#fef3f8] border border-[#fce7f3] rounded-lg px-3 py-2.5 text-sm text-[#1e293b] focus:outline-none focus:border-[#ec4899]"
                placeholder="e.g. 100" value={form.max_price} onChange={e => setForm(f => ({ ...f, max_price: e.target.value }))} />
            </div>
          </div>
          {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-lg bg-[#ec4899] hover:bg-[#db2777] text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Publishing...</> : "Publish Listing →"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Marketplace() {
  const { company } = useAuth();
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<ServiceListing | null>(null);
  const [creating, setCreating] = useState(false);
  const { data: listings, isLoading } = useQuery({
    queryKey: ["listings", filter],
    queryFn: () => api.listings.list(filter === "all" ? undefined : filter),
  });

  const isSeller = company?.type === "seller" || company?.type === "both";
  const isBuyer = company?.type === "buyer" || company?.type === "both";

  const subtitle = isBuyer && !isSeller
    ? "Browse event listings and launch AI sponsorship sessions"
    : isSeller && !isBuyer
    ? "Manage your event packages and attract sponsors"
    : "Browse events, post packages, and close sponsorship deals";

  return (
    <div className="p-8 max-w-7xl">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#1e293b]">Marketplace</h1>
          <p className="text-[#64748b] mt-1">{subtitle}</p>
        </div>
        {isSeller && (
          <button onClick={() => setCreating(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#ec4899] hover:bg-[#db2777] text-white rounded-lg text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> Post a Listing
          </button>
        )}
      </div>
      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${filter === f
                ? f === "all" ? "bg-[#ec4899] text-white" : "text-white"
                : "bg-white border border-[#fce7f3] text-[#64748b] hover:text-[#1e293b] hover:border-[#fbcfe8]"
              }`}
            style={filter === f && f !== "all" ? { backgroundColor: SERVICE_COLORS[f] } : undefined}
          >
            {f === "all" ? "All Services" : SERVICE_LABELS[f]}
          </button>
        ))}
      </div>
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="bg-white border border-[#fce7f3] rounded-xl h-64 animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(listings || []).map(l => {
            const isOwn = l.company_id === company?.id;
            const canNegotiate = isBuyer && !isOwn;
            return (
              <ListingCard
                key={l.id}
                listing={l}
                onSelect={() => setSelected(l)}
                canNegotiate={canNegotiate}
                isOwn={isOwn}
              />
            );
          })}
          {listings?.length === 0 && <p className="col-span-3 text-center text-[#64748b] py-16">No listings found</p>}
        </div>
      )}
      {selected && <StartModal listing={selected} onClose={() => setSelected(null)} />}
      {creating && <CreateListingModal onClose={() => setCreating(false)} />}
    </div>
  );
}
