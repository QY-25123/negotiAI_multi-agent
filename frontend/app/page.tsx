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
    title: "Buyer Initiates a Deal",
    desc: "A buyer sets their budget ceiling and target price, then triggers an AI session against the listing.",
    color: "#ec4899",
  },
  {
    number: "03",
    title: "Agents Propose Autonomously",
    desc: "Two LLM-powered agents take alternating turns — proposing, countering, and reasoning about the best deal — with no human input.",
    color: "#3b82f6",
  },
  {
    number: "04",
    title: "Human Reviews the Deal",
    desc: "When agents reach agreement, a human-in-the-loop review panel appears. Approve the deal or override constraints and re-run.",
    color: "#a855f7",
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
    label: "Deal Platform",
    color: "#ec4899",
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
  { icon: Cpu,          color: "#ec4899", title: "Manual Tool-Use Loop",    desc: "Each agent autonomously decides which tools to call and when — not a scripted flow." },
  { icon: Eye,          color: "#3b82f6", title: "Live SSE Streaming",      desc: "Every proposal and counter-offer is streamed to the UI in real time via Server-Sent Events." },
  { icon: ShieldCheck,  color: "#a855f7", title: "Human-in-the-Loop",       desc: "Deals pause for human review before finalisation. Override constraints and restart at any time." },
  { icon: MessageSquare,color: "#f59e0b", title: "Multi-Round Exchange",    desc: "Agents exchange up to 10 rounds of proposals, each moving incrementally toward a deal." },
  { icon: RefreshCw,    color: "#10b981", title: "Deal Retry",              desc: "Not happy with the deal? Adjust buyer ceiling or seller floor and re-trigger the agents." },
  { icon: FileCheck,    color: "#06b6d4", title: "Instant PDF Contracts",   desc: "Accepted terms are captured in a signed contract and available for download immediately." },
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
    <div className="min-h-screen bg-[#fff5fb] text-[#1e293b]">

      {/* Nav */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-8 py-4 border-b border-[#fce7f3] bg-[#fff5fb]/90 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#ec4899] to-[#db2777] flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold gradient-text">Agora</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-[#64748b] hover:text-[#1e293b] transition-colors px-3 py-1.5">
            Sign In
          </Link>
          <Link href="/register" className="text-sm font-medium px-4 py-2 rounded-lg border border-[#fce7f3] text-[#1e293b] hover:border-[#ec4899] hover:text-[#ec4899] transition-all">
            Create Account
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="flex flex-col items-center text-center px-6 pt-24 pb-20">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#ec4899]/10 border border-[#ec4899]/30 text-xs font-medium text-[#ec4899] mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-[#ec4899] animate-pulse" />
          AI Multi-Agent Marketplace
        </div>

        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-tight mb-6 max-w-4xl">
          <span className="text-[#1e293b]">Two AI Agents.</span>
          <br />
          <span className="gradient-text">One Deal.</span>
        </h1>

        <p className="text-lg text-[#475569] max-w-2xl mb-10 leading-relaxed">
          Agora deploys autonomous AI-powered agents on both sides of a B2B advertising deal.
          They propose, counter, and close — while you watch in real time and stay in control.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
          <button
            onClick={handleDemo}
            disabled={loading}
            className="group flex items-center gap-3 px-8 py-4 rounded-xl bg-[#ec4899] hover:bg-[#db2777] text-white font-bold text-base transition-all shadow-lg shadow-[#ec4899]/30 hover:shadow-[#ec4899]/50 hover:scale-105 disabled:opacity-70 disabled:scale-100"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 group-hover:rotate-12 transition-transform" />}
            {loading ? "Launching demo…" : "Try Live Demo"}
            {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
          </button>
          <Link href="/login" className="flex items-center gap-2 px-8 py-4 rounded-xl border border-[#fce7f3] hover:border-[#ec4899] text-[#475569] hover:text-[#ec4899] font-semibold text-base transition-all">
            Sign In
          </Link>
        </div>
        <p className="text-xs text-[#64748b]">No sign-up needed · Instant access · Live AI deal-making</p>
      </section>

      {/* Architecture */}
      <section className="border-t border-[#fce7f3] px-8 py-20 bg-[#fef3f8]">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-semibold text-[#ec4899] uppercase tracking-widest text-center mb-3">System Architecture</p>
          <h2 className="text-3xl font-bold text-[#1e293b] text-center mb-4">Two Agents. One Platform.</h2>
          <p className="text-[#64748b] text-center max-w-xl mx-auto mb-14 text-sm leading-relaxed">
            Each agent runs an independent tool-use loop powered by LLMs. They share a deal platform
            as their only communication channel — they never talk directly.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
            {ARCH.map(({ label, color, icon: Icon, points }) => (
              <div key={label} className="bg-white border border-[#fce7f3] rounded-2xl p-6 hover:border-[#fbcfe8] transition-colors shadow-sm">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
                    <Icon className="w-5 h-5" style={{ color }} />
                  </div>
                  <h3 className="text-sm font-bold text-[#1e293b]">{label}</h3>
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
            <span className="px-3 py-1 rounded-full bg-[#f59e0b]/10 border border-[#f59e0b]/20 text-[#d97706]">Seller Agent</span>
            <ArrowRight className="w-3.5 h-3.5" />
            <span className="px-3 py-1 rounded-full bg-[#ec4899]/10 border border-[#ec4899]/20 text-[#ec4899]">Platform</span>
            <ArrowRight className="w-3.5 h-3.5" />
            <span className="px-3 py-1 rounded-full bg-[#3b82f6]/10 border border-[#3b82f6]/20 text-[#3b82f6]">Buyer Agent</span>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-[#fce7f3] px-8 py-20">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-semibold text-[#ec4899] uppercase tracking-widest text-center mb-3">How It Works</p>
          <h2 className="text-3xl font-bold text-[#1e293b] text-center mb-14">From listing to signed contract</h2>

          <div className="space-y-5">
            {STEPS.map(({ number, title, desc, color }) => (
              <div key={number} className="flex gap-5 p-5 bg-white border border-[#fce7f3] rounded-xl hover:border-[#fbcfe8] hover:bg-[#fef3f8] transition-colors shadow-sm">
                <span className="text-2xl font-black shrink-0 w-10" style={{ color }}>{number}</span>
                <div>
                  <h3 className="text-sm font-bold text-[#1e293b] mb-1">{title}</h3>
                  <p className="text-xs text-[#64748b] leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-[#fce7f3] px-8 py-20 bg-[#fef3f8]">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-semibold text-[#ec4899] uppercase tracking-widest text-center mb-3">Capabilities</p>
          <h2 className="text-3xl font-bold text-[#1e293b] text-center mb-14">Built for real agentic workflows</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(({ icon: Icon, color, title, desc }) => (
              <div key={title} className="bg-white border border-[#fce7f3] rounded-xl p-5 hover:border-[#fbcfe8] hover:bg-[#fef3f8] transition-colors shadow-sm">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-4" style={{ backgroundColor: `${color}20` }}>
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
                <h3 className="text-sm font-semibold text-[#1e293b] mb-1.5">{title}</h3>
                <p className="text-xs text-[#64748b] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-[#fce7f3] px-8 py-24 text-center">
        <h2 className="text-4xl font-extrabold text-[#1e293b] mb-4">See it close a deal live.</h2>
        <p className="text-[#64748b] mb-10 max-w-md mx-auto text-sm">Jump in as a demo buyer and watch AI agents close a real advertising deal — no account needed.</p>
        <button
          onClick={handleDemo}
          disabled={loading}
          className="group inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-[#ec4899] hover:bg-[#db2777] text-white font-bold text-base transition-all shadow-lg shadow-[#ec4899]/30 hover:shadow-[#ec4899]/50 hover:scale-105 disabled:opacity-70 disabled:scale-100"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 group-hover:rotate-12 transition-transform" />}
          {loading ? "Launching…" : "Try Live Demo"}
          {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
        </button>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#fce7f3] px-8 py-5 text-center text-[10px] text-[#64748b]">
        Agora · AI Multi-Agent Marketplace
      </footer>
    </div>
  );
}
