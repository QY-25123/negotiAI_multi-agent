"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Loader2, Zap, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function Login() {
  const { login } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(form.email, form.password);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center p-4">

      {/* Back to home */}
      <Link href="/" className="flex items-center gap-1.5 text-xs text-[#64748b] hover:text-[#94a3b8] transition-colors mb-8 self-start max-w-sm w-full mx-auto">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to home
      </Link>

      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mb-8">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <span className="text-2xl font-bold gradient-text">Agora</span>
      </Link>

      {/* Card */}
      <div className="w-full max-w-sm bg-[#13131a] border border-[#1e1e2e] rounded-2xl p-8">
        <h1 className="text-xl font-bold text-white mb-1">Welcome back</h1>
        <p className="text-sm text-[#64748b] mb-7">Sign in to your account</p>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-[#94a3b8] block mb-1.5">Email</label>
            <input
              type="email"
              autoComplete="email"
              required
              className="w-full bg-[#0d0d14] border border-[#2a2a3e] rounded-lg px-3 py-2.5 text-sm text-[#e2e8f0] focus:outline-none focus:border-[#6366f1] transition-colors"
              placeholder="you@company.com"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[#94a3b8] block mb-1.5">Password</label>
            <input
              type="password"
              autoComplete="current-password"
              required
              className="w-full bg-[#0d0d14] border border-[#2a2a3e] rounded-lg px-3 py-2.5 text-sm text-[#e2e8f0] focus:outline-none focus:border-[#6366f1] transition-colors"
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            />
          </div>

          {error && <p className="text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-[#6366f1] hover:bg-[#5558e8] text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</> : "Sign in →"}
          </button>
        </form>

        <p className="text-center text-xs text-[#64748b] mt-6">
          No account?{" "}
          <Link href="/register" className="text-[#818cf8] hover:text-[#6366f1] transition-colors">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
