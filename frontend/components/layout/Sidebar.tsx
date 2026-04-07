"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Store, MessageSquare, Building2, UserPlus, Zap } from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/marketplace", label: "Marketplace", icon: Store },
  { href: "/negotiations", label: "Negotiations", icon: MessageSquare },
  { href: "/companies", label: "Companies", icon: Building2 },
  { href: "/register", label: "Register", icon: UserPlus },
];

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="fixed left-0 top-0 h-full w-[240px] bg-[#0d0d14] border-r border-[#1e1e2e] flex flex-col z-50">
      {/* Logo */}
      <div className="p-6 border-b border-[#1e1e2e]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold gradient-text">NegotiAI</span>
        </div>
        <p className="text-[11px] text-[#64748b] mt-1">Agent-to-Agent Marketplace</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = path === href || path.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group
                ${active
                  ? "bg-[#6366f1]/20 text-[#818cf8] border-l-2 border-[#6366f1]"
                  : "text-[#64748b] hover:text-[#e2e8f0] hover:bg-[#1a1a24]"
                }`}
            >
              <Icon className={`w-4 h-4 ${active ? "text-[#6366f1]" : "text-[#64748b] group-hover:text-[#94a3b8]"}`} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-[#1e1e2e]">
        <p className="text-[10px] text-[#64748b] text-center">Powered by Claude Opus 4.6</p>
      </div>
    </aside>
  );
}
