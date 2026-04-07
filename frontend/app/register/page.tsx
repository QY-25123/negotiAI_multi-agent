"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { CheckCircle2, Loader2 } from "lucide-react";

const INDUSTRIES = ["Food & Beverage","Marketing & Advertising","HR & Staffing","Events & Conferences","Finance & Investment","Events & Entertainment","Technology","Retail","Healthcare","Other"];
const COLORS = ["#6366f1","#3b82f6","#10b981","#f59e0b","#8b5cf6","#ef4444","#06b6d4","#f97316"];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function Register() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", industry: "", type: "both", description: "", avatar_color: COLORS[0], website: "", contact_email: "" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.industry) { setError("Name and industry are required"); return; }
    setLoading(true); setError("");
    try {
      await api.companies.create({ ...form, logo_initials: getInitials(form.name) });
      setSuccess(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Registration failed";
      setError(msg);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="p-8 max-w-lg mx-auto mt-16 text-center">
        <div className="w-16 h-16 rounded-full bg-[#22c55e]/20 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-[#22c55e]" />
        </div>
        <h2 className="text-2xl font-bold text-[#e2e8f0] mb-2">Company Registered!</h2>
        <p className="text-[#64748b] mb-6">Your company <strong className="text-[#e2e8f0]">{form.name}</strong> is now on NegotiAI.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => router.push("/marketplace")} className="px-5 py-2.5 bg-[#6366f1] hover:bg-[#5558e8] text-white rounded-lg text-sm font-medium transition-colors">
            Browse Marketplace →
          </button>
          <button onClick={() => { setSuccess(false); setForm({ name: "", industry: "", type: "both", description: "", avatar_color: COLORS[0], website: "", contact_email: "" }); }}
            className="px-5 py-2.5 bg-[#13131a] border border-[#2a2a3e] text-[#94a3b8] rounded-lg text-sm font-medium hover:text-[#e2e8f0] transition-colors">
            Register Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#e2e8f0]">Register Company</h1>
        <p className="text-[#64748b] mt-1">Join the NegotiAI marketplace</p>
      </div>

      <form onSubmit={submit} className="bg-[#13131a] border border-[#1e1e2e] rounded-2xl p-6 space-y-5">
        {/* Name */}
        <div>
          <label className="text-xs font-medium text-[#94a3b8] block mb-1.5">Company Name *</label>
          <input className="w-full bg-[#0d0d14] border border-[#2a2a3e] rounded-lg px-3 py-2.5 text-sm text-[#e2e8f0] focus:outline-none focus:border-[#6366f1] transition-colors"
            placeholder="e.g. Acme Corp" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
        </div>

        {/* Industry + Type */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-[#94a3b8] block mb-1.5">Industry *</label>
            <select className="w-full bg-[#0d0d14] border border-[#2a2a3e] rounded-lg px-3 py-2.5 text-sm text-[#e2e8f0] focus:outline-none focus:border-[#6366f1]"
              value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))} required>
              <option value="">Select...</option>
              {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-[#94a3b8] block mb-1.5">Role</label>
            <select className="w-full bg-[#0d0d14] border border-[#2a2a3e] rounded-lg px-3 py-2.5 text-sm text-[#e2e8f0] focus:outline-none focus:border-[#6366f1]"
              value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              <option value="seller">Seller</option>
              <option value="buyer">Buyer</option>
              <option value="both">Both</option>
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="text-xs font-medium text-[#94a3b8] block mb-1.5">Description</label>
          <textarea className="w-full bg-[#0d0d14] border border-[#2a2a3e] rounded-lg px-3 py-2.5 text-sm text-[#e2e8f0] focus:outline-none focus:border-[#6366f1] resize-none"
            rows={3} placeholder="Brief description of your company..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        </div>

        {/* Avatar color */}
        <div>
          <label className="text-xs font-medium text-[#94a3b8] block mb-2">Avatar Color</label>
          <div className="flex gap-2 items-center">
            {COLORS.map(c => (
              <button key={c} type="button" onClick={() => setForm(f => ({ ...f, avatar_color: c }))}
                className={`w-8 h-8 rounded-full transition-transform ${form.avatar_color === c ? "scale-125 ring-2 ring-white ring-offset-1 ring-offset-[#13131a]" : "hover:scale-110"}`}
                style={{ backgroundColor: c }} />
            ))}
            {/* Preview */}
            <div className="ml-2 w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: form.avatar_color }}>
              {form.name ? getInitials(form.name) : "AB"}
            </div>
          </div>
        </div>

        {/* Optional fields */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-[#94a3b8] block mb-1.5">Website</label>
            <input className="w-full bg-[#0d0d14] border border-[#2a2a3e] rounded-lg px-3 py-2.5 text-sm text-[#e2e8f0] focus:outline-none focus:border-[#6366f1]"
              placeholder="https://..." value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-medium text-[#94a3b8] block mb-1.5">Email</label>
            <input type="email" className="w-full bg-[#0d0d14] border border-[#2a2a3e] rounded-lg px-3 py-2.5 text-sm text-[#e2e8f0] focus:outline-none focus:border-[#6366f1]"
              placeholder="contact@..." value={form.contact_email} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} />
          </div>
        </div>

        {error && <p className="text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>}

        <button type="submit" disabled={loading}
          className="w-full py-3 rounded-lg bg-[#6366f1] hover:bg-[#5558e8] text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Registering...</> : "Register Company →"}
        </button>
      </form>
    </div>
  );
}
