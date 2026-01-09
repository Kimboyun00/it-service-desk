"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type NotificationItem = {
  id: string;
  ticket_id?: number | null;
  ticket_title?: string | null;
  type: string;
  message: string;
  created_at: string;
};

const STORAGE_KEY = "it_service_desk_notifications_seen";

export function useNotifications() {
  const [lastSeen, setLastSeen] = useState<number>(0);

  useEffect(() => {
    const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return;
    const parsed = Number(raw);
    if (!Number.isNaN(parsed)) setLastSeen(parsed);
  }, []);

  const { data = [], isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api<NotificationItem[]>("/notifications"),
    staleTime: 10_000,
    refetchInterval: 30_000,
  });

  const notifications = useMemo(
    () => [...data].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [data]
  );

  const unreadCount = useMemo(
    () => notifications.filter((n) => new Date(n.created_at).getTime() > lastSeen).length,
    [notifications, lastSeen]
  );

  const markAllRead = () => {
    const now = Date.now();
    setLastSeen(now);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, String(now));
    }
  };

  return { notifications, unreadCount, isLoading, markAllRead };
}
