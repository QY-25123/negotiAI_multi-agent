"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import {
  Zap, Bot, ArrowRight, Loader2, MessageSquare, ShieldCheck,
  FileCheck, RefreshCw, Cpu, GitMerge, Eye, CheckCircle2,
} from "lucide-react";

const STEPS = [
  {
    number: "01",
    title: "Seller Posts a Listing",
    desc: "A seller company registers their ad space — format, pricing floor, duration constraints — on the marketplace.",
    color: "#f59e0b",
  },
  {
    number: "02",
    title: "Buyer Initiates Negotiation",
    desc: "A buyer sets their budget ceiling and target price, then triggers an AI negotiation against the listing.",
    color: "#6366f1",
  },
  {
    number: "03",
    title: "Agents Negotiate Autonomously",
    desc: "Two Claude-powered agents take alternating turns — proposing, countering, and reasoning about the best deal — with no human input.",
    color: "#3b82f6",
  },
  {
    number: "04",
    title: "Human Reviews the Deal",
    desc: "When agents reach agreement, a human-in-the-loop review panel appears. Approve the deal or override constraints and re-run.",
    color: "#8b5cf6",
  },
  {
    number: "05",
    title: "Contract Signed",
    desc: "Approval instantly generates a signed contract with all agreed terms, downloadable as a PDF.",
    color: "#10b981",
  },
];

const ARCH = [
  {
    label: "Seller Agent",
    color: "#f59e0b",
    icon: Bot,
    points: [
      "Large Language Model",
      "Adaptive thinking enabled",
      "Tools: view inventory, respond to proposal",
      "Protects price floor, max 10% discount",
    ],
  },
  {
    label: "Negotiation Platform",
    color: "#6366f1",
    icon: GitMerge,
    points: [
      "Shared in-memory message board",
      "Proposal history & status tracking",
      "Round limit enforcement",
      "SSE event bus → live frontend",
    ],
  },
  {
    label: "Buyer Agent",
    color: "#3b82f6",
    icon: Bot,
    points: [
      "Large Language Model",
      "Adaptive thinking enabled",
      "Tools: browse listings, submit proposal",
      "Stays within budget ceiling",
    ],
  },
];

const FEATURES = [
  { icon: Cpu,          color: "#6366f1", title: "Manual Tool-Use Loop",       desc: "Each agent autonomously decides which tools to call and when — not a scripted flow." },
  { icon: Eye,          color: "#3b82f6", title: "Live SSE Streaming",         desc: "Every proposal and counter-offer is streamed to the UI in real time via Server-Sent Events." },
  { icon: ShieldCheck,  color: "#8b5cf6", title: "Human-in-the-Loop",          desc: "Deals pause for human review before finalisation. Override constraints and renegotiate at any time." },
  { icon: MessageSquare,color: "#f59e0b", title: "Multi-Round Negotiation",    desc: "Agents exchange up to 10 rounds of proposals, each moving incrementally toward a deal." },
  { icon: RefreshCw,    color: "#10b981", title: "Renegotiation Support",      desc: "Not happy with the deal? Adjust buyer ceiling or seller floor and re-trigger the agents." },
  { icon: FileCheck,    color: "#06b6d4", title: "Instant PDF Contracts",      desc: "Accepted terms are captured in a signed contract and available for download immediately." },
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
    <div className="min-h-screen bg-[#0a0a0f] text-[#e2e8f0]">

      {/* Nav */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-8 py-4 border-b border-[#1e1e2e] bg-[#0a0a0f]/90 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold gradient-text">Agora</span>
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
      <section className="flex flex-col items-center text-center px-6 pt-24 pb-20">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#6366f1]/10 border border-[#6366f1]/30 text-xs font-medium text-[#818cf8] mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-[#6366f1] animate-pulse" />
          AI Multi-Agent Marketplace
        </div>

        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-tight mb-6 max-w-4xl">
          <span className="text-white">Two AI Agents.</span>
          <br />
          <span className="gradient-text">One Deal.</span>
        </h1>

        <p className="text-lg text-[#94a3b8] max-w-2xl mb-10 leading-relaxed">
          Agora deploys autonomous Claude-powered agents on both sides of a B2B advertising deal.
          They propose, counter, and close — while you watch in real time and stay in control.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
          <button
            onClick={handleDemo}
            disabled={loading}
            className="group flex items-center gap-3 px-8 py-4 rounded-xl bg-[#6366f1] hover:bg-[#5558e8] text-white font-bold text-base transition-all shadow-lg shadow-[#6366f1]/30 hover:shadow-[#6366f1]/50 hover:scale-105 disabled:opacity-70 disabled:scale-100"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 group-hover:rotate-12 transition-transform" />}
            {loading ? "Launching demo…" : "Try Live Demo"}
            {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
          </button>
          <Link href="/login" className="flex items-center gap-2 px-8 py-4 rounded-xl border border-[#2a2a3e] hover:border-[#6366f1] text-[#94a3b8] hover:text-white font-semibold text-base transition-all">
            Sign In
          </Link>
        </div>
        <p className="text-xs text-[#64748b]">No sign-up needed · Instant access · Live AI negotiation</p>
      </section>

      {/* Architecture */}
      <section className="border-t border-[#1e1e2e] px-8 py-20 bg-[#0d0d14]">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-semibold text-[#6366f1] uppercase tracking-widest text-center mb-3">System Architecture</p>
          <h2 className="text-3xl font-bold text-white text-center mb-4">Two Agents. One Platform.</h2>
          <p className="text-[#64748b] text-center max-w-xl mx-auto mb-14 text-sm leading-relaxed">
            Each agent runs an independent tool-use loop powered by Claude. They share a negotiation platform
            as their only communication channel — they never talk directly.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
            {ARCH.map(({ label, color, icon: Icon, points }) => (
              <div key={label} className="bg-[#13131a] border border-[#1e1e2e] rounded-2xl p-6 hover:border-[#2a2a3e] transition-colors">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
                    <Icon className="w-5 h-5" style={{ color }} />
                  </div>
                  <h3 className="text-sm font-bold text-white">{label}</h3>
                </div>
                <ul className="space-y-2.5">
                  {points.map(p => (
                    <li key={p} className="flex items-start gap-2 text-xs text-[#64748b]">
                      <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color }} />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Flow arrow */}
          <div className="flex items-center justify-center gap-4 mt-6 text-xs text-[#64748b]">
            <span className="px-3 py-1 rounded-full bg-[#f59e0b]/10 border border-[#f59e0b]/20 text-[#f59e0b]">Seller Agent</span>
            <ArrowRight className="w-3.5 h-3.5" />
            <span className="px-3 py-1 rounded-full bg-[#6366f1]/10 border border-[#6366f1]/20 text-[#818cf8]">Platform</span>
            <ArrowRight className="w-3.5 h-3.5" />
            <span className="px-3 py-1 rounded-full bg-[#3b82f6]/10 border border-[#3b82f6]/20 text-[#60a5fa]">Buyer Agent</span>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-[#1e1e2e] px-8 py-20">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-semibold text-[#6366f1] uppercase tracking-widest text-center mb-3">How It Works</p>
          <h2 className="text-3xl font-bold text-white text-center mb-14">From listing to signed contract</h2>

          <div className="space-y-5">
            {STEPS.map(({ number, title, desc, color }) => (
              <div key={number} className="flex gap-5 p-5 bg-[#0d0d14] border border-[#1e1e2e] rounded-xl hover:border-[#2a2a3e] transition-colors">
                <span className="text-2xl font-black shrink-0 w-10" style={{ color }}>{number}</span>
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">{title}</h3>
                  <p className="text-xs text-[#64748b] leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-[#1e1e2e] px-8 py-20 bg-[#0d0d14]">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-semibold text-[#6366f1] uppercase tracking-widest text-center mb-3">Capabilities</p>
          <h2 className="text-3xl font-bold text-white text-center mb-14">Built for real agentic workflows</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(({ icon: Icon, color, title, desc }) => (
              <div key={title} className="bg-[#13131a] border border-[#1e1e2e] rounded-xl p-5 hover:border-[#2a2a3e] transition-colors">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-4" style={{ backgroundColor: `${color}20` }}>
                  <Icon className="w-4.5 h-4.5 w-5 h-5" style={{ color }} />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1.5">{title}</h3>
                <p className="text-xs text-[#64748b] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-[#1e1e2e] px-8 py-24 text-center">
        <h2 className="text-4xl font-extrabold text-white mb-4">See it negotiate live.</h2>
        <p className="text-[#64748b] mb-10 max-w-md mx-auto text-sm">Jump in as a demo buyer and watch Claude close a real advertising deal — no account needed.</p>
        <button
          onClick={handleDemo}
          disabled={loading}
          className="group inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-[#6366f1] hover:bg-[#5558e8] text-white font-bold text-base transition-all shadow-lg shadow-[#6366f1]/30 hover:shadow-[#6366f1]/50 hover:scale-105 disabled:opacity-70 disabled:scale-100"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 group-hover:rotate-12 transition-transform" />}
          {loading ? "Launching…" : "Try Live Demo"}
          {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
        </button>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1e1e2e] px-8 py-5 text-center text-[10px] text-[#64748b]">
        Agora · AI Multi-Agent Marketplace
      </footer>
    </div>
  );
}
