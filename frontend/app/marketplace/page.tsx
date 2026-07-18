"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api, ServiceListing } from "@/lib/api";
import { formatCurrency, SERVICE_COLORS, SERVICE_LABELS } from "@/lib/utils";
import { CompanyAvatar } from "@/components/ui/CompanyAvatar";
import { Megaphone, Users, Banknote, MapPin, ArrowRight, X, Loader2, Plus, Calendar, UserCheck, Tag, Info } from "lucide-react";
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
    <div className={`bg-white border rounded-xl p-5 transition-all flex flex-col group shadow-sm cursor-pointer
      ${isOwn ? "border-[#ec4899]/40 hover:border-[#ec4899]/70" : "border-[#fce7f3] hover:border-[#fbcfe8] hover:bg-[#fef3f8]"}`}
      onClick={onSelect}
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
        <button className={`w-full mt-2 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2
          ${canNegotiate
            ? "border border-[#ec4899]/40 text-[#ec4899] hover:bg-[#ec4899]/10 hover:text-[#db2777]"
            : "border border-[#ec4899]/20 text-[#64748b]"}`}>
          {canNegotiate ? <><ArrowRight className="w-4 h-4" /> View Details</> : "Your listing"}
        </button>
      </div>
    </div>
  );
}

function ListingDetailModal({ listing, canNegotiate, isOwn, onClose, onStartSession }: {
  listing: ServiceListing; canNegotiate: boolean; isOwn: boolean;
  onClose: () => void; onStartSession: () => void;
}) {
  const Icon = SERVICE_ICONS[listing.service_type] || Megaphone;
  const color = SERVICE_COLORS[listing.service_type];
  const isSponsorListing = listing.company?.type === "sponsor";

  let terms: Record<string, unknown> = {};
  try { terms = JSON.parse(listing.terms_json || "{}"); } catch { /* empty */ }

  const perks: string[] = Array.isArray(terms.perks) ? (terms.perks as string[]) : [];
  const audienceSize = terms.audience_size as number | undefined;
  const minAudience = terms.min_audience_size as number | undefined;
  const eventDuration = (terms.event_duration_days || terms.preferred_duration_days) as number | undefined;
  const maxDuration = terms.max_duration_days as number | undefined;
  const availableFrom = terms.available_from as string | undefined;
  const eventTypePreference = terms.event_type_preference as string | undefined;
  const maxBudgetPerDay = terms.max_budget_per_day as number | undefined;
  const targetPricePerDay = terms.target_price_per_day as number | undefined;
  const notes = terms.notes as string | undefined;

  const formatPerk = (perk: string) =>
    perk.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white border border-[#fce7f3] rounded-2xl w-full max-w-2xl shadow-xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-[#fce7f3]">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="p-2.5 rounded-xl shrink-0" style={{ backgroundColor: `${color}20` }}>
              <Icon className="w-5 h-5" style={{ color }} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ color, backgroundColor: `${color}15` }}>
                  {SERVICE_LABELS[listing.service_type]}
                </span>
                {isSponsorListing && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#10b981]/10 text-[#10b981]">Sponsor Looking</span>
                )}
                {isOwn && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#ec4899]/10 text-[#ec4899]">Your Listing</span>
                )}
              </div>
              <h2 className="text-lg font-bold text-[#1e293b] leading-snug">{listing.title}</h2>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#fef3f8] transition-colors shrink-0 ml-2">
            <X className="w-4 h-4 text-[#64748b]" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {/* Company info */}
          {listing.company && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#fef3f8] border border-[#fce7f3]">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                style={{ backgroundColor: listing.company.avatar_color }}>
                {listing.company.logo_initials}
              </div>
              <div>
                <p className="text-sm font-semibold text-[#1e293b]">{listing.company.name}</p>
                <p className="text-xs text-[#64748b]">{listing.company.industry}</p>
              </div>
            </div>
          )}

          {/* Full description */}
          <div>
            <p className="text-sm text-[#475569] leading-relaxed">{listing.description}</p>
          </div>

          {/* Key details grid */}
          <div className="grid grid-cols-2 gap-3">
            {(listing.min_price || listing.max_price) && (
              <div className="p-3 rounded-xl bg-[#f8fafc] border border-[#e2e8f0]">
                <p className="text-[10px] font-medium text-[#64748b] uppercase tracking-wide mb-1">
                  {isSponsorListing ? "Sponsor Budget Range" : "Price Range"}
                </p>
                <p className="text-sm font-bold text-[#1e293b]">
                  {listing.min_price ? `$${listing.min_price.toLocaleString()}` : "—"}
                  {listing.max_price ? ` – $${listing.max_price.toLocaleString()}` : ""}
                </p>
              </div>
            )}
            {(audienceSize || minAudience) && (
              <div className="p-3 rounded-xl bg-[#f8fafc] border border-[#e2e8f0]">
                <p className="text-[10px] font-medium text-[#64748b] uppercase tracking-wide mb-1 flex items-center gap-1">
                  <UserCheck className="w-3 h-3" /> {isSponsorListing ? "Min. Audience" : "Audience Size"}
                </p>
                <p className="text-sm font-bold text-[#1e293b]">
                  {(audienceSize || minAudience)?.toLocaleString()}+ attendees
                </p>
              </div>
            )}
            {(eventDuration || maxDuration) && (
              <div className="p-3 rounded-xl bg-[#f8fafc] border border-[#e2e8f0]">
                <p className="text-[10px] font-medium text-[#64748b] uppercase tracking-wide mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Duration
                </p>
                <p className="text-sm font-bold text-[#1e293b]">
                  {eventDuration === maxDuration || !maxDuration
                    ? `${eventDuration} day${eventDuration === 1 ? "" : "s"}`
                    : `${eventDuration}–${maxDuration} days`}
                </p>
              </div>
            )}
            {availableFrom && (
              <div className="p-3 rounded-xl bg-[#f8fafc] border border-[#e2e8f0]">
                <p className="text-[10px] font-medium text-[#64748b] uppercase tracking-wide mb-1">Available From</p>
                <p className="text-sm font-bold text-[#1e293b]">{availableFrom}</p>
              </div>
            )}
            {listing.location && (
              <div className="p-3 rounded-xl bg-[#f8fafc] border border-[#e2e8f0]">
                <p className="text-[10px] font-medium text-[#64748b] uppercase tracking-wide mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Location
                </p>
                <p className="text-sm font-bold text-[#1e293b]">{listing.location}</p>
              </div>
            )}
            {isSponsorListing && maxBudgetPerDay && (
              <div className="p-3 rounded-xl bg-[#f8fafc] border border-[#e2e8f0]">
                <p className="text-[10px] font-medium text-[#64748b] uppercase tracking-wide mb-1">Daily Budget</p>
                <p className="text-sm font-bold text-[#1e293b]">
                  {targetPricePerDay ? `$${targetPricePerDay.toLocaleString()} – ` : "Up to "}
                  ${maxBudgetPerDay.toLocaleString()}/day
                </p>
              </div>
            )}
          </div>

          {/* Event type preference (sponsor listings) */}
          {eventTypePreference && (
            <div>
              <p className="text-xs font-medium text-[#64748b] uppercase tracking-wide mb-2 flex items-center gap-1">
                <Tag className="w-3 h-3" /> Looking For
              </p>
              <p className="text-sm text-[#1e293b] capitalize">{eventTypePreference}</p>
            </div>
          )}

          {/* Perks / inclusions */}
          {perks.length > 0 && (
            <div>
              <p className="text-xs font-medium text-[#64748b] uppercase tracking-wide mb-2">What's Included</p>
              <div className="flex flex-wrap gap-1.5">
                {perks.map((p, i) => (
                  <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-[#ec4899]/8 text-[#db2777] border border-[#ec4899]/20">
                    {formatPerk(p)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Organizer notes */}
          {notes && (
            <div className="p-3 rounded-xl bg-[#fffbeb] border border-[#fde68a]">
              <p className="text-[10px] font-medium text-[#92400e] uppercase tracking-wide mb-1 flex items-center gap-1">
                <Info className="w-3 h-3" /> Notes
              </p>
              <p className="text-xs text-[#78350f]">{notes}</p>
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div className="p-6 pt-4 border-t border-[#fce7f3]">
          {canNegotiate ? (
            <button onClick={onStartSession}
              className="w-full py-3 rounded-xl bg-[#ec4899] hover:bg-[#db2777] text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2">
              {isSponsorListing ? "🤖 Pitch to This Sponsor →" : "🤖 Launch AI Session →"}
            </button>
          ) : (
            <div className="w-full py-3 rounded-xl border border-[#ec4899]/20 text-[#64748b] text-sm text-center">
              This is your listing
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StartModal({ listing, onClose }: { listing: ServiceListing; onClose: () => void }) {
  const { company: authCompany } = useAuth();
  const router = useRouter();

  // Sponsor listings (company.type === "sponsor") flip the roles:
  // the initiating user is an organizer pitching to the sponsor.
  const isSponsorListing = listing.company?.type === "sponsor";

  const [form, setForm] = useState({
    target_price_per_unit: "",
    max_budget_per_unit: "",
    preferred_duration_days: "2",
    start_date: "2026-09-01",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authCompany?.id || !form.max_budget_per_unit) { setError("Please fill all required fields"); return; }
    const target = form.target_price_per_unit ? parseFloat(form.target_price_per_unit) : undefined;
    const max = parseFloat(form.max_budget_per_unit);
    if (target !== undefined && target >= max) {
      setError(isSponsorListing ? "Floor price must be lower than asking price" : "Target price must be lower than max budget");
      return;
    }
    setLoading(true); setError("");
    try {
      const res = await api.negotiations.start({
        listing_id: listing.id,
        buyer_company_id: authCompany.id,   // always the initiating company; router detects reverse_roles
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

  const rangeHint = listing.min_price || listing.max_price
    ? isSponsorListing
      ? `Sponsor budget: ${listing.min_price ? `$${listing.min_price.toLocaleString()}` : "—"} – ${listing.max_price ? `$${listing.max_price.toLocaleString()}` : "—"}/day`
      : `Package range: ${listing.min_price ? `$${listing.min_price.toLocaleString()}` : "—"} – ${listing.max_price ? `$${listing.max_price.toLocaleString()}` : "—"}/day`
    : null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white border border-[#fce7f3] rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-[#1e293b]">
              {isSponsorListing ? "Pitch to Sponsor" : "Start AI Session"}
            </h2>
            <p className="text-xs text-[#64748b] mt-0.5 truncate max-w-[280px]">{listing.title}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#fef3f8] transition-colors"><X className="w-4 h-4 text-[#64748b]" /></button>
        </div>
        {rangeHint && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-[#ec4899]/10 border border-[#ec4899]/20 text-xs text-[#ec4899]">
            {rangeHint}
          </div>
        )}
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-[#475569] block mb-1.5">
              {isSponsorListing ? "Pitching as" : "Sponsoring as"}
            </label>
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
            <label className="text-xs font-medium text-[#475569] block mb-1.5">
              {isSponsorListing ? "Your Pricing (per day)" : "Your Budget (per day)"}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <input type="number" min="0" step="0.01"
                  className="w-full bg-[#fef3f8] border border-[#fce7f3] rounded-lg px-3 py-2.5 text-sm text-[#1e293b] focus:outline-none focus:border-[#ec4899]"
                  placeholder={isSponsorListing ? "Floor price" : "Target price"}
                  value={form.target_price_per_unit}
                  onChange={e => setForm(f => ({ ...f, target_price_per_unit: e.target.value }))} />
                <p className="text-[10px] text-[#64748b] mt-1">
                  {isSponsorListing ? "Minimum accepted" : "Opening offer"}
                </p>
              </div>
              <div>
                <input type="number" min="0" step="0.01"
                  className="w-full bg-[#fef3f8] border border-[#fce7f3] rounded-lg px-3 py-2.5 text-sm text-[#1e293b] focus:outline-none focus:border-[#ec4899]"
                  placeholder={isSponsorListing ? "Asking price *" : "Max budget *"}
                  value={form.max_budget_per_unit}
                  onChange={e => setForm(f => ({ ...f, max_budget_per_unit: e.target.value }))} required />
                <p className="text-[10px] text-[#64748b] mt-1">
                  {isSponsorListing ? "Opening ask *" : "Hard ceiling *"}
                </p>
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
  const [detail, setDetail] = useState<ServiceListing | null>(null);   // detail modal
  const [selected, setSelected] = useState<ServiceListing | null>(null); // start session modal
  const [creating, setCreating] = useState(false);
  const { data: listings, isLoading } = useQuery({
    queryKey: ["listings", filter],
    queryFn: () => api.listings.list(filter === "all" ? undefined : filter),
  });

  const subtitle = company?.type === "sponsor"
    ? "Post your sponsorship briefs and discover events to sponsor"
    : company?.type === "organizer"
    ? "Browse sponsor listings and post your event packages"
    : "Post listings, find partners, and close sponsorship deals";

  return (
    <div className="p-8 max-w-7xl">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#1e293b]">Marketplace</h1>
          <p className="text-[#64748b] mt-1">{subtitle}</p>
        </div>
        <button onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#ec4899] hover:bg-[#db2777] text-white rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Post a Listing
        </button>
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
            const canNegotiate = !isOwn;
            return (
              <ListingCard
                key={l.id}
                listing={l}
                onSelect={() => setDetail(l)}
                canNegotiate={canNegotiate}
                isOwn={isOwn}
              />
            );
          })}
          {listings?.length === 0 && <p className="col-span-3 text-center text-[#64748b] py-16">No listings found</p>}
        </div>
      )}
      {detail && (
        <ListingDetailModal
          listing={detail}
          canNegotiate={detail.company_id !== company?.id}
          isOwn={detail.company_id === company?.id}
          onClose={() => setDetail(null)}
          onStartSession={() => { setSelected(detail); setDetail(null); }}
        />
      )}
      {selected && <StartModal listing={selected} onClose={() => setSelected(null)} />}
      {creating && <CreateListingModal onClose={() => setCreating(false)} />}
    </div>
  );
}
