"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useMe } from "@/lib/auth-context";
import { clearToken } from "@/lib/auth";
import { useNotifications } from "@/lib/use-notifications";

function formatDate(v?: string | null) {
  if (!v) return "-";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleString();
}

function typeLabel(type: string) {
  const map: Record<string, string> = {
    status_changed: "상태 변경",
    assignee_assigned: "담당자 배정",
    assignee_changed: "담당자 변경",
    requester_updated: "요청 수정",
    requester_commented: "요청자 댓글",
    new_ticket: "새 요청",
  };
  return map[type] ?? type;
}

export default function TopBar() {
  const me = useMe();
  const router = useRouter();
  const { notifications, unreadCount, isLoading, markAllRead } = useNotifications();
  const [notifOpen, setNotifOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement | null>(null);

  const items = useMemo(() => notifications.slice(0, 20), [notifications]);
  const isStaff = me.role === "admin" || me.role === "agent";

  useEffect(() => {
    if (!notifOpen) return;
    const handlePointer = (event: PointerEvent) => {
      if (!notifRef.current) return;
      if (!notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointer);
    return () => document.removeEventListener("pointerdown", handlePointer);
  }, [notifOpen]);

  return (
    <div className="flex items-center gap-3">
      <div className="relative" ref={notifRef}>
        <button
          type="button"
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          onClick={() => {
            const next = !notifOpen;
            setNotifOpen(next);
            if (next) markAllRead();
          }}
          aria-label="알림"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8a6 6 0 10-12 0c0 7-3 8-3 8h18s-3-1-3-8" />
            <path d="M13.73 21a2 2 0 01-3.46 0" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 rounded-full bg-red-600 text-white text-[10px] min-w-[18px] h-[18px] flex items-center justify-center px-1">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
        {notifOpen && (
          <div className="absolute right-0 mt-2 w-[360px] rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden z-20">
            <div className="px-4 py-3 border-b text-sm font-semibold text-slate-900">알림</div>
            <div className="max-h-[360px] overflow-y-auto">
              {isLoading && <div className="px-4 py-3 text-sm text-slate-500">불러오는 중...</div>}
              {!isLoading && items.length === 0 && (
                <div className="px-4 py-3 text-sm text-slate-500">새 알림이 없습니다.</div>
              )}
              {items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className="w-full text-left px-4 py-3 border-b last:border-b-0 hover:bg-slate-50"
                  onClick={() => {
                    if (n.ticket_id) {
                      const href = isStaff ? `/admin/tickets/${n.ticket_id}` : `/tickets/${n.ticket_id}`;
                      router.push(href);
                    }
                    setNotifOpen(false);
                  }}
                >
                  <div className="text-xs text-slate-500">{typeLabel(n.type)}</div>
                  <div className="text-sm text-slate-900">{n.message || n.ticket_title || "알림"}</div>
                  <div className="text-xs text-slate-500 mt-1">{formatDate(n.created_at)}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="relative">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          <span className="font-medium">{me.email}</span>
          <svg viewBox="0 0 20 20" className={`h-4 w-4 transition-transform ${menuOpen ? "rotate-180" : ""}`} fill="currentColor">
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.114l3.71-3.884a.75.75 0 011.08 1.04l-4.24 4.44a.75.75 0 01-1.08 0l-4.24-4.44a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>
        {menuOpen && (
          <div className="absolute right-0 mt-2 w-44 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden z-20">
            <button
              type="button"
              className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              onClick={() => {
                clearToken();
                router.replace("/login");
              }}
            >
              로그아웃
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
