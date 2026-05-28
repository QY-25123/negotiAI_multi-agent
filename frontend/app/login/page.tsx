"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Loader2, Zap, ArrowRight } from "lucide-react";
import Link from "next/link";

function DemoPanel() {
  const { tryDemo } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDemo = async () => {
    setLoading(true);
    setError("");
    try {
      await tryDemo();
      router.push("/marketplace");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Demo unavailable");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#6366f1]/10 border border-[#6366f1]/30 text-[10px] font-medium text-[#818cf8] mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-[#6366f1] animate-pulse" />
          No sign-up needed
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Just exploring?</h2>
        <p className="text-sm text-[#94a3b8]">Jump straight into the app as a demo buyer. No account required.</p>
      </div>

      <div className="space-y-3 flex-1">
        {[
          "Browse live advertising listings",
          "Launch an AI negotiation instantly",
          "Watch Claude negotiate in real time",
          "Review auto-generated contracts",
        ].map(item => (
          <div key={item} className="flex items-center gap-2.5 text-sm text-[#94a3b8]">
            <div className="w-1.5 h-1.5 rounded-full bg-[#6366f1] shrink-0" />
            {item}
          </div>
        ))}
      </div>

      {error && <p className="text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-2 mt-4">{error}</p>}

      <button
        onClick={handleDemo}
        disabled={loading}
        className="mt-6 w-full py-3.5 rounded-xl bg-[#6366f1] hover:bg-[#5558e8] text-white font-bold text-base transition-all shadow-lg shadow-[#6366f1]/25 hover:shadow-[#6366f1]/40 flex items-center justify-center gap-2.5 disabled:opacity-60 group"
      >
        {loading ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Launching…</>
        ) : (
          <><Zap className="w-4 h-4 group-hover:rotate-12 transition-transform" /> Try Demo <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>
        )}
      </button>
    </div>
  );
}

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
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mb-8">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <span className="text-2xl font-bold gradient-text">NegotiAI</span>
      </Link>

      {/* Two-panel card */}
      <div className="w-full max-w-2xl bg-[#13131a] border border-[#1e1e2e] rounded-2xl overflow-hidden flex flex-col md:flex-row">
        {/* Left — login form */}
        <div className="flex-1 p-7 border-b md:border-b-0 md:border-r border-[#1e1e2e]">
          <h1 className="text-xl font-bold text-white mb-1">Welcome back</h1>
          <p className="text-sm text-[#64748b] mb-6">Sign in to your account</p>

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
              className="w-full py-2.5 rounded-lg bg-[#1e1e2e] hover:bg-[#2a2a3e] border border-[#2a2a3e] hover:border-[#6366f1] text-[#e2e8f0] font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</> : "Sign in →"}
            </button>
          </form>

          <p className="text-center text-xs text-[#64748b] mt-5">
            No account?{" "}
            <Link href="/register" className="text-[#818cf8] hover:text-[#6366f1] transition-colors">
              Create one
            </Link>
          </p>
        </div>

        {/* Right — demo */}
        <div className="flex-1 p-7 bg-gradient-to-br from-[#6366f1]/5 to-[#8b5cf6]/5">
          <DemoPanel />
        </div>
      </div>
    </div>
  );
}
