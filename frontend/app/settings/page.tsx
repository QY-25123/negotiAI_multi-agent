"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Save, Loader2, CheckCircle2 } from "lucide-react";

const ROLE_OPTIONS = [
  { value: "sponsor",   label: "Sponsor — we fund events" },
  { value: "organizer", label: "Organizer — we host events" },
  { value: "both",      label: "Both" },
];

const COLOR_OPTIONS = [
  "#ec4899", "#8b5cf6", "#3b82f6", "#06b6d4",
  "#10b981", "#f59e0b", "#ef4444", "#6366f1",
];

const INDUSTRY_OPTIONS = [
  "Technology", "Finance & Investment", "Food & Beverage", "Healthcare",
  "Education", "Retail & E-commerce", "Events & Conferences", "Events & Entertainment",
  "Media & Marketing", "Manufacturing", "Other",
];

export default function SettingsPage() {
  const { company, user, refreshCompany, isLoading } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    type: "sponsor",
    industry: "",
    description: "",
    website: "",
    avatar_color: "#ec4899",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !company) router.push("/login");
  }, [isLoading, company, router]);

  useEffect(() => {
    if (company) {
      setForm({
        name: company.name,
        type: company.type,
        industry: company.industry,
        description: "",
        website: "",
        avatar_color: company.avatar_color,
      });
      // fetch full company detail for description + website
      api.companies.get(company.id).then(detail => {
        setForm(f => ({
          ...f,
          description: detail.description ?? "",
          website: detail.website ?? "",
        }));
      }).catch(() => {});
    }
  }, [company]);

  const set = (key: string, val: string) => {
    setForm(f => ({ ...f, [key]: val }));
    setSaved(false);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    setSaving(true);
    setError(null);
    try {
      await api.companies.update(company.id, {
        name: form.name.trim() || undefined,
        type: form.type,
        industry: form.industry.trim() || undefined,
        description: form.description.trim() || undefined,
        website: form.website.trim() || undefined,
        avatar_color: form.avatar_color,
      });
      await refreshCompany();
      setSaved(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || !company) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#fff5fb]">
        <Loader2 className="w-6 h-6 animate-spin text-[#ec4899]" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#fff5fb] p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-[#1e293b] mb-1">Settings</h1>
        <p className="text-sm text-[#64748b] mb-8">Update your company profile and preferences.</p>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Avatar preview */}
          <div className="bg-white border border-[#fce7f3] rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-[#1e293b] mb-4">Profile Picture</h2>
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold"
                style={{ backgroundColor: form.avatar_color }}
              >
                {form.name
                  ? (form.name.trim().split(" ").length > 1
                      ? form.name.trim().split(" ")[0][0] + form.name.trim().split(" ")[1][0]
                      : form.name.trim().slice(0, 2)
                    ).toUpperCase()
                  : company.logo_initials}
              </div>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => set("avatar_color", c)}
                    className="w-8 h-8 rounded-full border-2 transition-all"
                    style={{
                      backgroundColor: c,
                      borderColor: form.avatar_color === c ? "#1e293b" : "transparent",
                      transform: form.avatar_color === c ? "scale(1.15)" : "scale(1)",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Company details */}
          <div className="bg-white border border-[#fce7f3] rounded-2xl p-6 space-y-5">
            <h2 className="text-sm font-semibold text-[#1e293b]">Company Details</h2>

            <div>
              <label className="block text-xs font-medium text-[#475569] mb-1.5">Company Name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => set("name", e.target.value)}
                placeholder="Your company name"
                className="w-full px-3 py-2.5 rounded-lg bg-[#fef3f8] border border-[#fce7f3] text-[#1e293b] text-sm placeholder-[#94a3b8] focus:outline-none focus:border-[#ec4899] focus:ring-1 focus:ring-[#ec4899]/30 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#475569] mb-1.5">Role</label>
              <div className="grid grid-cols-3 gap-2">
                {ROLE_OPTIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => set("type", value)}
                    className={`px-3 py-2.5 rounded-lg text-xs font-medium border text-left transition-all ${
                      form.type === value
                        ? "bg-[#ec4899]/10 border-[#ec4899] text-[#ec4899]"
                        : "bg-[#fef3f8] border-[#fce7f3] text-[#475569] hover:border-[#fbcfe8]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#475569] mb-1.5">Industry</label>
              <select
                value={form.industry}
                onChange={e => set("industry", e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-[#fef3f8] border border-[#fce7f3] text-[#1e293b] text-sm focus:outline-none focus:border-[#ec4899] focus:ring-1 focus:ring-[#ec4899]/30 transition-all"
              >
                <option value="">Select industry…</option>
                {INDUSTRY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#475569] mb-1.5">Description</label>
              <textarea
                value={form.description}
                onChange={e => set("description", e.target.value)}
                rows={4}
                placeholder="Tell sponsors or organizers about your company…"
                className="w-full px-3 py-2.5 rounded-lg bg-[#fef3f8] border border-[#fce7f3] text-[#1e293b] text-sm placeholder-[#94a3b8] focus:outline-none focus:border-[#ec4899] focus:ring-1 focus:ring-[#ec4899]/30 transition-all resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#475569] mb-1.5">Website</label>
              <input
                type="url"
                value={form.website}
                onChange={e => set("website", e.target.value)}
                placeholder="https://yourcompany.com"
                className="w-full px-3 py-2.5 rounded-lg bg-[#fef3f8] border border-[#fce7f3] text-[#1e293b] text-sm placeholder-[#94a3b8] focus:outline-none focus:border-[#ec4899] focus:ring-1 focus:ring-[#ec4899]/30 transition-all"
              />
            </div>
          </div>

          {/* Account info (read-only) */}
          <div className="bg-white border border-[#fce7f3] rounded-2xl p-6 space-y-3">
            <h2 className="text-sm font-semibold text-[#1e293b] mb-1">Account</h2>
            <div>
              <p className="text-xs text-[#94a3b8] mb-0.5">Email</p>
              <p className="text-sm text-[#475569]">{user?.email}</p>
            </div>
            <p className="text-xs text-[#94a3b8]">Email address cannot be changed here.</p>
          </div>

          {/* Error / success */}
          {error && (
            <div className="px-4 py-3 rounded-lg bg-[#fef2f2] border border-[#fecaca] text-sm text-[#ef4444]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#ec4899] hover:bg-[#db2777] text-white text-sm font-semibold transition-all shadow-md shadow-[#ec4899]/20 disabled:opacity-70"
          >
            {saving
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
              : saved
              ? <><CheckCircle2 className="w-4 h-4" /> Saved!</>
              : <><Save className="w-4 h-4" /> Save Changes</>
            }
          </button>
        </form>
      </div>
    </div>
  );
}
