"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Loader2, Zap } from "lucide-react";
import Link from "next/link";

const INDUSTRIES = ["Food & Beverage","Marketing & Advertising","HR & Staffing","Events & Conferences","Finance & Investment","Events & Entertainment","Technology","Retail","Healthcare","Other"];
const COLORS = ["#ec4899","#3b82f6","#10b981","#f59e0b","#a855f7","#ef4444","#06b6d4","#f97316"];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function Register() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    email: "", password: "", confirmPassword: "",
    company_name: "", industry: "", company_type: "sponsor",
    description: "", avatar_color: COLORS[0], website: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.company_name || !form.industry) { setError("Company name and industry are required"); return; }
    if (form.password.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (form.password !== form.confirmPassword) { setError("Passwords do not match"); return; }
    setLoading(true);
    setError("");
    try {
      await register({
        email: form.email,
        password: form.password,
        company_name: form.company_name,
        company_type: form.company_type,
        industry: form.industry,
        description: form.description,
        avatar_color: form.avatar_color,
        website: form.website || undefined,
      });
      router.push("/marketplace");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fff5fb] flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        {/* Logo */}
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#ec4899] to-[#db2777] flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-bold text-[#1e293b]">Agora</span>
        </div>

        <div className="bg-white border border-[#fce7f3] rounded-2xl p-6 shadow-sm">
          <h1 className="text-xl font-bold text-[#1e293b] mb-1">Create your account</h1>
          <p className="text-sm text-[#64748b] mb-6">Register to start sponsoring or hosting events</p>

          <form onSubmit={submit} className="space-y-5">
            {/* Account credentials */}
            <div>
              <p className="text-xs font-semibold text-[#64748b] uppercase tracking-wider mb-3">Account</p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-[#475569] block mb-1.5">Email *</label>
                  <input
                    type="email"
                    autoComplete="email"
                    required
                    className="w-full bg-[#fef3f8] border border-[#fce7f3] rounded-lg px-3 py-2.5 text-sm text-[#1e293b] focus:outline-none focus:border-[#ec4899] transition-colors"
                    placeholder="you@company.com"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-[#475569] block mb-1.5">Password *</label>
                    <input
                      type="password"
                      autoComplete="new-password"
                      required
                      className="w-full bg-[#fef3f8] border border-[#fce7f3] rounded-lg px-3 py-2.5 text-sm text-[#1e293b] focus:outline-none focus:border-[#ec4899] transition-colors"
                      placeholder="Min. 8 characters"
                      value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[#475569] block mb-1.5">Confirm Password *</label>
                    <input
                      type="password"
                      autoComplete="new-password"
                      required
                      className="w-full bg-[#fef3f8] border border-[#fce7f3] rounded-lg px-3 py-2.5 text-sm text-[#1e293b] focus:outline-none focus:border-[#ec4899] transition-colors"
                      placeholder="••••••••"
                      value={form.confirmPassword}
                      onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-[#fce7f3] pt-5">
              <p className="text-xs font-semibold text-[#64748b] uppercase tracking-wider mb-3">Company</p>
              <div className="space-y-3">
                {/* Company name */}
                <div>
                  <label className="text-xs font-medium text-[#475569] block mb-1.5">Company Name *</label>
                  <input
                    required
                    className="w-full bg-[#fef3f8] border border-[#fce7f3] rounded-lg px-3 py-2.5 text-sm text-[#1e293b] focus:outline-none focus:border-[#ec4899] transition-colors"
                    placeholder="e.g. Acme Corp"
                    value={form.company_name}
                    onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
                  />
                </div>

                {/* Industry + Role */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-[#475569] block mb-1.5">Industry *</label>
                    <select
                      required
                      className="w-full bg-[#fef3f8] border border-[#fce7f3] rounded-lg px-3 py-2.5 text-sm text-[#1e293b] focus:outline-none focus:border-[#ec4899]"
                      value={form.industry}
                      onChange={e => setForm(f => ({ ...f, industry: e.target.value }))}
                    >
                      <option value="">Select...</option>
                      {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[#475569] block mb-1.5">My role</label>
                    <select
                      className="w-full bg-[#fef3f8] border border-[#fce7f3] rounded-lg px-3 py-2.5 text-sm text-[#1e293b] focus:outline-none focus:border-[#ec4899]"
                      value={form.company_type}
                      onChange={e => setForm(f => ({ ...f, company_type: e.target.value }))}
                    >
                      <option value="sponsor">Sponsor — fund events for exposure</option>
                      <option value="organizer">Organizer — host events, seek sponsors</option>
                      <option value="both">Both</option>
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs font-medium text-[#475569] block mb-1.5">Description</label>
                  <textarea
                    className="w-full bg-[#fef3f8] border border-[#fce7f3] rounded-lg px-3 py-2.5 text-sm text-[#1e293b] focus:outline-none focus:border-[#ec4899] resize-none"
                    rows={2}
                    placeholder="Brief description of your company..."
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  />
                </div>

                {/* Avatar color */}
                <div>
                  <label className="text-xs font-medium text-[#475569] block mb-2">Avatar Color</label>
                  <div className="flex gap-2 items-center">
                    {COLORS.map(c => (
                      <button key={c} type="button" onClick={() => setForm(f => ({ ...f, avatar_color: c }))}
                        className={`w-7 h-7 rounded-full transition-transform ${form.avatar_color === c ? "scale-125 ring-2 ring-[#ec4899] ring-offset-1 ring-offset-white" : "hover:scale-110"}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                    <div className="ml-2 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: form.avatar_color }}>
                      {form.company_name ? getInitials(form.company_name) : "AB"}
                    </div>
                  </div>
                </div>

                {/* Website */}
                <div>
                  <label className="text-xs font-medium text-[#475569] block mb-1.5">Website</label>
                  <input
                    className="w-full bg-[#fef3f8] border border-[#fce7f3] rounded-lg px-3 py-2.5 text-sm text-[#1e293b] focus:outline-none focus:border-[#ec4899]"
                    placeholder="https://..."
                    value={form.website}
                    onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-[#ec4899] hover:bg-[#db2777] text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account...</> : "Create Account →"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-[#64748b] mt-4">
          Already have an account?{" "}
          <Link href="/login" className="text-[#ec4899] hover:text-[#db2777] transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
