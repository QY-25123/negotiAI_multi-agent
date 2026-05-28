"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { Zap, Bot, BarChart3, FileCheck, ArrowRight, Loader2 } from "lucide-react";

const FEATURES = [
  {
    icon: Bot,
    title: "Autonomous AI Agents",
    desc: "Claude-powered agents negotiate on your behalf — propose, counter, and close deals automatically.",
    color: "#6366f1",
  },
  {
    icon: BarChart3,
    title: "Real-Time Negotiation",
    desc: "Watch the negotiation unfold live, round by round. Step in to override or approve at any time.",
    color: "#3b82f6",
  },
  {
    icon: FileCheck,
    title: "Instant Contracts",
    desc: "Once a deal is struck, a signed contract is generated and available as a PDF immediately.",
    color: "#10b981",
  },
];

export default function Landing() {
  const { tryDemo } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDemo = async () => {
    setLoading(true);
    try {
      await tryDemo();
      router.push("/marketplace");
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
      {/* Nav */}
      <header className="flex items-center justify-between px-8 py-5 border-b border-[#1e1e2e]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold gradient-text">NegotiAI</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-[#94a3b8] hover:text-white transition-colors px-3 py-1.5">
            Sign In
          </Link>
          <Link href="/register" className="text-sm font-medium px-4 py-2 rounded-lg border border-[#2a2a3e] text-[#e2e8f0] hover:border-[#6366f1] hover:text-white transition-all">
            Create Account
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#6366f1]/10 border border-[#6366f1]/30 text-xs font-medium text-[#818cf8] mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-[#6366f1] animate-pulse" />
          Powered by Claude AI
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-tight mb-6 max-w-4xl">
          <span className="text-white">AI Agents That</span>
          <br />
          <span className="gradient-text">Negotiate For You</span>
        </h1>

        <p className="text-lg text-[#94a3b8] max-w-xl mb-10 leading-relaxed">
          Set your budget. Claude does the rest — autonomously proposing, countering, and closing
          B2B advertising deals in real time.
        </p>

        {/* Primary CTA */}
        <button
          onClick={handleDemo}
          disabled={loading}
          className="group flex items-center gap-3 px-8 py-4 rounded-xl bg-[#6366f1] hover:bg-[#5558e8] text-white font-bold text-lg transition-all shadow-lg shadow-[#6366f1]/30 hover:shadow-[#6366f1]/50 hover:scale-105 disabled:opacity-70 disabled:scale-100 mb-6"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Zap className="w-5 h-5 group-hover:rotate-12 transition-transform" />
          )}
          {loading ? "Launching demo…" : "Try Demo"}
          {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
        </button>

        <p className="text-sm text-[#64748b]">
          No sign-up needed · Live AI negotiation · Instant access
        </p>

        {/* Secondary links */}
        <div className="flex items-center gap-2 mt-6 text-sm text-[#64748b]">
          <span>Already have an account?</span>
          <Link href="/login" className="text-[#818cf8] hover:text-[#6366f1] transition-colors font-medium">
            Sign in →
          </Link>
        </div>
      </main>

      {/* Features */}
      <section className="border-t border-[#1e1e2e] px-8 py-16">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {FEATURES.map(({ icon: Icon, title, desc, color }) => (
            <div key={title} className="text-center">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: `${color}20` }}
              >
                <Icon className="w-6 h-6" style={{ color }} />
              </div>
              <h3 className="text-sm font-semibold text-white mb-2">{title}</h3>
              <p className="text-xs text-[#64748b] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1e1e2e] px-8 py-5 text-center text-[10px] text-[#64748b]">
        NegotiAI · Agent-to-Agent Marketplace · Built with Claude
      </footer>
    </div>
  );
}
