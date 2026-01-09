"use client";

import { useMemo, useEffect } from "react";
import { usePathname } from "next/navigation";
import { QueryClientProvider } from "@tanstack/react-query";
import { makeQueryClient } from "@/lib/queryClient";
import AuthGuard from "@/components/AuthGuard";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";

function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <div className="lg:ml-80">
        <div className="px-4 pt-4">
          <div className="mx-auto w-full max-w-[1520px] flex justify-end">
            <TopBar />
          </div>
        </div>
        <main className="min-h-screen px-4 py-5 app-content">
          <div className="mx-auto w-full max-w-[1520px]">{children}</div>
        </main>
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
