"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useMe } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { TiptapDoc } from "@/lib/tiptap";
import PageHeader from "@/components/PageHeader";

const TiptapViewer = dynamic(() => import("@/components/TiptapViewer"), { ssr: false });

type Faq = {
  id: number;
  question: string;
  answer: TiptapDoc;
  category_id: number | null;
  category_name: string | null;
  category_code: string | null;
  created_at: string;
  updated_at: string;
};

type TicketCategory = {
  id: number;
  code: string;
  name: string;
  description?: string | null;
};

export default function FaqPage() {
  const me = useMe();
  const router = useRouter();
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [categories, setCategories] = useState<TicketCategory[]>([]);
  const [openId, setOpenId] = useState<number | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canEdit = useMemo(() => me.role === "admin" || me.role === "agent", [me.role]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([api<Faq[]>("/faqs"), api<TicketCategory[]>("/ticket-categories")])
      .then(([faqData, categoryData]) => {
        if (!alive) return;
        setFaqs(faqData);
        setCategories(categoryData);
        setError(null);
      })
      .catch((e: any) => {
        if (!alive) return;
        setError(e.message ?? "FAQ를 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const toggle = (id: number) => setOpenId((prev) => (prev === id ? null : id));

  const handleDelete = async (id: number) => {
    try {
      await api(`/faqs/${id}`, { method: "DELETE" });
      setFaqs((prev) => prev.filter((f) => f.id !== id));
    } catch (e: any) {
      setError(e.message ?? "삭제에 실패했습니다.");
    }
  };

  const handleEdit = (id: number) => {
    router.push(`/faq/${id}/edit`);
  };

  const filteredFaqs = useMemo(() => {
    if (categoryFilter === "all") return faqs;
    const id = Number(categoryFilter);
    return faqs.filter((f) => f.category_id === id);
  }, [faqs, categoryFilter]);

  return (
    <div className="p-5 space-y-5">
      <PageHeader
        eyebrow="FAQ"
        title="자주 묻는 질문"
        subtitle="빠르게 해결되는 기본 안내를 확인하세요."
        actions={
          canEdit ? (
            <button
              className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
              onClick={() => router.push("/faq/new")}
            >
              등록
            </button>
          ) : null
        }
      />

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="flex items-center gap-2">
        <label className="text-sm text-slate-700">카테고리</label>
        <select
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="all">전체</option>
          {categories.map((c) => (
            <option key={c.id} value={String(c.id)}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="border border-slate-200/70 rounded-2xl p-4 text-sm text-slate-500 bg-white shadow-sm">
          FAQ를 불러오는 중입니다...
        </div>
      ) : filteredFaqs.length === 0 ? (
        <div className="border border-slate-200/70 rounded-2xl p-4 text-sm text-slate-500 bg-white shadow-sm">
          등록된 FAQ가 없습니다.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFaqs.map((f) => {
            const open = openId === f.id;
            const categoryLabel = f.category_name || "기타";
            return (
              <div key={f.id} className="border border-slate-200/70 rounded-2xl bg-white p-4 space-y-2 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <button className="text-left flex-1" onClick={() => toggle(f.id)}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                        {categoryLabel}
                      </span>
                      <div className="text-sm font-semibold text-slate-900">{f.question}</div>
                    </div>
                  </button>
                  {canEdit && (
                    <div className="flex items-center gap-2">
                      <button
                        className="px-2.5 py-1 text-[11px] rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                        onClick={() => handleEdit(f.id)}
                      >
                        수정
                      </button>
                      <button
                        className="px-2.5 py-1 text-[11px] rounded-md border border-red-600 bg-red-600 text-white hover:bg-red-700"
                        onClick={() => handleDelete(f.id)}
                      >
                        삭제
                      </button>
                    </div>
                  )}
                </div>
                {open && (
                  <div className="text-sm text-slate-700 leading-6">
                    <TiptapViewer value={f.answer} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
