"use client";

import { useMemo } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { makeQueryClient } from "@/lib/queryClient";
import AuthGuard from "@/components/AuthGuard";
import Sidebar from "@/components/Sidebar";
import Link from "next/link";
import { usePathname } from "next/navigation";

function TopNav() {
  const pathname = usePathname();
  const items = [
    { href: "/home", label: "HOME" },
    { href: "/tickets", label: "고객요청" },
    { href: "/notices", label: "공지사항" },
    { href: "/faq", label: "FAQ" },
    { href: "/stats", label: "통계" },
  ];

  return (
    <header className="h-14 border-b bg-white/70 backdrop-blur sticky top-0 z-20">
      <div className="h-full px-6 flex items-center justify-between">
        <div className="font-semibold tracking-tight">CSR</div>
        <nav className="flex items-center gap-8 text-sm">
          {items.map((it) => {
            const active = pathname === it.href || pathname?.startsWith(it.href + "/");
            return (
              <Link
                key={it.href}
                href={it.href}
                className={`hover:underline ${
                  active ? "font-semibold" : "text-gray-600"
                }`}
              >
                {it.label}
              </Link>
            );
          })}
        </nav>
        <div className="text-xs text-gray-600">KDI국제정책대학원</div>
      </div>
    </header>
  );
}

function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-[260px_1fr]">
      <Sidebar />
      <div className="min-w-0">
        <TopNav />
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const qc = useMemo(() => makeQueryClient(), []);
  return (
    <QueryClientProvider client={qc}>
      <AuthGuard>
        <AppShell>{children}</AppShell>
      </AuthGuard>
    </QueryClientProvider>
  );
}
