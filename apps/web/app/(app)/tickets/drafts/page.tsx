"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import Pagination from "@/components/Pagination";
import ErrorDialog from "@/components/ErrorDialog";

type DraftTicket = {
  id: number;
  title?: string | null;
  created_at: string;
  updated_at?: string | null;
};

function formatDate(v?: string | null) {
  if (!v) return "-";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleString();
}

export default function DraftTicketsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["draft-tickets"],
    queryFn: () => api<DraftTicket[]>("/draft-tickets"),
    staleTime: 5_000,
  });

  useEffect(() => {
    if (!error) return;
    setErrorMessage((error as any)?.message ?? "임시 보관함을 불러오지 못했습니다.");
  }, [error]);

  useEffect(() => {
    setPage(1);
  }, [data?.length]);

  const items = data ?? [];
  const pageItems = useMemo(
    () => items.slice((page - 1) * pageSize, page * pageSize),
    [items, page, pageSize]
  );

  return (
    <div className="p-5 space-y-5">
      <PageHeader
        title="임시 보관함"
        meta={
          <span>
            총 <span className="text-emerald-700 font-semibold">{items.length}</span>건
          </span>
        }
      />

      <ErrorDialog message={errorMessage} onClose={() => setErrorMessage(null)} />

      {isLoading && <div className="text-sm text-slate-500">목록을 불러오는 중...</div>}

      <div className="border border-slate-200/70 rounded-2xl overflow-hidden bg-white shadow-sm">
        <table className="w-full text-sm text-center">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left p-3">제목</th>
              <th className="text-center p-3 w-40">업데이트</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((draft) => (
              <tr
                key={draft.id}
                className="border-t cursor-pointer hover:bg-slate-50"
                onClick={() => router.push(`/tickets/drafts/${draft.id}`)}
              >
                <td className="p-3 text-left">
                  <div className="font-medium text-slate-900">{draft.title || "제목 없음"}</div>
                </td>
                <td className="p-3 text-center text-slate-600">{formatDate(draft.updated_at ?? draft.created_at)}</td>
              </tr>
            ))}
            {!isLoading && pageItems.length === 0 && (
              <tr className="border-t">
                <td className="p-4 text-slate-500 text-center" colSpan={2}>
                  임시 보관된 요청이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} total={items.length} pageSize={pageSize} onChange={setPage} />
    </div>
  );
}
