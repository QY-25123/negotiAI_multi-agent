"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Store, MessageSquare, Building2, Zap, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const COMPANIES_LABEL: Record<string, string> = {
  buyer: "Sellers",
  seller: "Buyers",
  both: "Companies",
};

const ROLE_LABEL: Record<string, string> = {
  seller: "Seller",
  buyer: "Buyer",
  both: "Seller & Buyer",
};

export function Sidebar() {
  const path = usePathname();
  const router = useRouter();
  const { company, user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const nav = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/marketplace", label: "Marketplace", icon: Store },
    { href: "/negotiations", label: "Negotiations", icon: MessageSquare },
    { href: "/companies", label: COMPANIES_LABEL[company?.type ?? "both"] ?? "Companies", icon: Building2 },
  ];

  return (
    <aside className="fixed left-0 top-0 h-full w-[240px] bg-[#0d0d14] border-r border-[#1e1e2e] flex flex-col z-50">
      {/* Logo */}
      <div className="p-6 border-b border-[#1e1e2e]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold gradient-text">Agora</span>
        </div>
        <p className="text-[11px] text-[#64748b] mt-1">AI Multi-Agent Marketplace</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => {
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

      {/* User info + logout */}
      <div className="p-4 border-t border-[#1e1e2e] space-y-3">
        {company && (
          <div className="flex items-center gap-2.5 px-1">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
              style={{ backgroundColor: company.avatar_color }}
            >
              {company.logo_initials}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-[#e2e8f0] truncate">{company.name}</p>
              <p className="text-[10px] text-[#64748b]">{ROLE_LABEL[company.type] ?? company.type}</p>
            </div>
          </div>
        )}
        {user && (
          <p className="text-[10px] text-[#64748b] px-1 truncate">{user.email}</p>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-[#64748b] hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition-all"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
