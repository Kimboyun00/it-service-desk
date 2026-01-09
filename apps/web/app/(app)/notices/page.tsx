"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMe } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { extractText, TiptapDoc } from "@/lib/tiptap";
import PageHeader from "@/components/PageHeader";

type Notice = {
  id: number;
  title: string;
  body: TiptapDoc;
  created_at: string;
  updated_at: string;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

export default function NoticesPage() {
  const me = useMe();
  const router = useRouter();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canEdit = useMemo(() => me.role === "admin" || me.role === "agent", [me.role]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api<Notice[]>("/notices")
      .then((data) => {
        if (!alive) return;
        setNotices(data);
        setError(null);
      })
      .catch((e: any) => {
        if (!alive) return;
        setError(e.message ?? "공지사항을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const excerpt = (text: string) => (text.length > 80 ? `${text.slice(0, 80)}...` : text);

  return (
    <div className="p-5 space-y-5">
      <PageHeader
        eyebrow="NOTICE"
        title="공지사항"
        subtitle="주요 공지 및 운영 안내를 확인하세요."
        actions={
          canEdit ? (
            <button
              className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
              onClick={() => router.push("/notices/new")}
            >
              등록
            </button>
          ) : null
        }
      />

      {error && <div className="text-sm text-red-600">{error}</div>}

      {loading ? (
        <div className="border border-slate-200/70 rounded-2xl p-4 text-sm text-slate-500 bg-white shadow-sm">
          공지사항을 불러오는 중입니다...
        </div>
      ) : notices.length === 0 ? (
        <div className="border border-slate-200/70 rounded-2xl p-4 text-sm text-slate-500 bg-white shadow-sm">
          등록된 공지사항이 없습니다.
        </div>
      ) : (
        <div className="border border-slate-200/70 rounded-2xl divide-y bg-white shadow-sm">
          {notices.map((n) => (
            <button
              key={n.id}
              className="w-full text-left p-4 space-y-1 hover:bg-slate-50 transition"
              onClick={() => router.push(`/notices/${n.id}`)}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="text-lg font-semibold truncate text-slate-900">{n.title}</div>
                <span className="text-xs text-slate-500">{formatDate(n.created_at)}</span>
              </div>
              <div className="text-sm text-slate-700 leading-6">{excerpt(extractText(n.body))}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
