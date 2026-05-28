"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Sidebar } from "./Sidebar";

const PUBLIC_PATHS = ["/", "/login", "/register"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isPublic = PUBLIC_PATHS.includes(pathname);

  useEffect(() => {
    if (isLoading) return;
    if (!user && !isPublic) router.replace("/login");
    if (user && isPublic) router.replace("/dashboard");
  }, [user, isLoading, isPublic, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0f]">
        <div className="w-6 h-6 border-2 border-[#6366f1] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isPublic) {
    return <div className="min-h-screen">{children}</div>;
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-[240px] min-h-screen">{children}</main>
    </div>
  );
}
