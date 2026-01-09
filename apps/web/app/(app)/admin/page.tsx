"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useMe } from "@/lib/auth-context";
import { useTicketCategories } from "@/lib/use-ticket-categories";
import ErrorDialog from "@/components/ErrorDialog";

type Ticket = {
  id: number;
  status: string;
  category?: string;
  work_type?: string | null;
  created_at?: string;
  updated_at?: string;
};

function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div
      className={`rounded-xl border p-4 shadow-sm ${accent ? "bg-emerald-50 border-emerald-100" : "bg-white border-gray-200"}`}
    >
      <div className="text-sm text-gray-600">{label}</div>
      <div className="text-2xl font-semibold mt-1 text-gray-900">{value}</div>
    </div>
  );
}

function VerticalBarChart({ data, title }: { data: { label: string; value: number }[]; title: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="rounded-xl border bg-white shadow-sm p-4 space-y-3">
      <div className="text-sm font-semibold text-gray-800">{title}</div>
      <div className="h-44 flex items-end gap-2">
        {data.map((d) => {
          const heightPct = Math.max(6, (d.value / max) * 100);
          return (
          <div key={d.label} className="flex-1 flex flex-col items-center gap-2">
            <div className="w-full h-32 flex items-end justify-center relative">
              <div
                className="absolute text-xs text-gray-600"
                style={{ bottom: `calc(${heightPct}% + 4px)` }}
              >
                {d.value}
              </div>
              <div
                className="w-3 rounded-full bg-emerald-500 transition-all duration-300"
                style={{ height: `${heightPct}%` }}
              />
            </div>
            <div className="text-xs text-gray-600 text-center leading-tight break-keep">{d.label}</div>
          </div>
        );
        })}
      </div>
    </div>
  );
}

function AreaLineChart({
  title,
  labels,
  values,
  faded,
}: {
  title: string;
  labels: string[];
  values: number[];
  faded?: boolean;
}) {
  const width = 1000;
  const height = 260;
  const padding = 12;
  const max = Math.max(1, ...values);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const points = values.map((v, i) => {
    const x = padding + (i / Math.max(1, values.length - 1)) * (width - padding * 2);
    const y = height - padding - (v / max) * (height - padding * 2);
    return { x, y };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    .join(" ");
  const areaPath = `${linePath} L ${width - padding},${height - padding} L ${padding},${height - padding} Z`;

  const handleMove = (event: React.MouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width) return;
    const x = event.clientX - rect.left;
    const ratio = Math.min(1, Math.max(0, x / rect.width));
    const idx = Math.round(ratio * (values.length - 1));
    setHoverIdx(idx);
  };

  const handleLeave = () => setHoverIdx(null);
  const hoverPoint = hoverIdx !== null ? points[hoverIdx] : null;
  const hoverLabel = hoverIdx !== null ? labels[hoverIdx] : null;
  const hoverValue = hoverIdx !== null ? values[hoverIdx] : null;

  return (
    <div className="rounded-xl border bg-white shadow-sm p-4 space-y-3">
      <div className="text-sm font-semibold text-gray-800">{title}</div>
      <div className="relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className={`w-full h-64 transition-opacity duration-300 ${faded ? "opacity-40" : "opacity-100"}`}
          onMouseMove={handleMove}
          onMouseLeave={handleLeave}
        >
          <defs>
            <linearGradient id="areaGrad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#areaGrad)" />
          <path d={linePath} fill="none" stroke="#10b981" strokeWidth="2.5" />
          {hoverPoint && (
            <circle cx={hoverPoint.x} cy={hoverPoint.y} r="4.5" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
          )}
        </svg>
        {hoverPoint && hoverLabel && hoverValue !== null && (
          <div
            className="absolute z-10 pointer-events-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-lg"
            style={{
              left: `${(hoverPoint.x / width) * 100}%`,
              top: `${(hoverPoint.y / height) * 100}%`,
              transform: "translate(-50%, -170%)",
            }}
          >
            <div className="font-semibold text-slate-900">{hoverValue}건</div>
            <div className="text-[11px] text-slate-500 mt-0.5">{hoverLabel}</div>
          </div>
        )}
        <div className="flex justify-between text-xs text-gray-500 px-1">
          <span>{labels[0]}</span>
          <span>{labels[Math.floor(labels.length / 2)]}</span>
          <span>{labels[labels.length - 1]}</span>
        </div>
      </div>
    </div>
  );
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function formatDateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function formatMonthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function weekStart(d: Date) {
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = (day + 6) % 7;
  copy.setDate(copy.getDate() - diff);
  return startOfDay(copy);
}

function formatWeekKey(d: Date) {
  const ws = weekStart(d);
  return `${ws.getFullYear()}-${String(ws.getMonth() + 1).padStart(2, "0")}-${String(ws.getDate()).padStart(2, "0")}`;
}

export default function AdminDashboard() {
  const me = useMe();
  const router = useRouter();
  const { categories, map: categoryMap } = useTicketCategories();
  const [range, setRange] = useState<"daily" | "weekly" | "monthly">("daily");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fade, setFade] = useState(false);

  if (!(me.role === "admin" || me.role === "agent")) {
    router.replace("/home");
    return null;
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-dashboard-tickets"],
    queryFn: () => api<Ticket[]>("/tickets?scope=all&limit=100&offset=0"),
    staleTime: 5_000,
  });

  useEffect(() => {
    if (!error) return;
    setErrorMessage((error as any)?.message ?? "대시보드 데이터를 불러오지 못했습니다.");
  }, [error]);

  useEffect(() => {
    setFade(true);
    const t = setTimeout(() => setFade(false), 200);
    return () => clearTimeout(t);
  }, [range]);

  const stats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let todayNew = 0;
    let todayDone = 0;
    let totalPending = 0;

    const categoryCodes = categories.length ? categories.map((c) => c.code) : Object.keys(categoryMap);
    const byCategory: Record<string, number> = {};
    categoryCodes.forEach((code) => {
      byCategory[code] = 0;
    });
    if (!("etc" in byCategory)) byCategory["etc"] = 0;

    const workTypeKeys = ["incident", "request", "change", "other"] as const;
    const byWorkType: Record<string, number> = {
      incident: 0,
      request: 0,
      change: 0,
      other: 0,
    };

    (data ?? []).forEach((t) => {
      const created = t.created_at ? new Date(t.created_at) : null;
      const updated = t.updated_at ? new Date(t.updated_at) : created;

      const status = (t.status || "").toLowerCase();
      if (status === "open" || status === "in_progress") totalPending++;
      if (created && created >= today) todayNew++;
      if (updated && updated >= today && status === "resolved") todayDone++;

      const cat = t.category ?? "etc";
      if (!(cat in byCategory)) byCategory[cat] = 0;
      byCategory[cat] += 1;

      const rawWorkType = t.work_type ?? "other";
      const workType = workTypeKeys.includes(rawWorkType as any) ? (rawWorkType as string) : "other";
      byWorkType[workType] = (byWorkType[workType] || 0) + 1;
    });

    const categoryChart = Object.entries(byCategory).map(([label, value]) => ({
      label: categoryMap[label] ?? (label === "etc" ? "기타" : label),
      value,
    }));

    const workTypeLabels: Record<string, string> = {
      incident: "장애",
      request: "요청",
      change: "변경",
      other: "기타",
    };
    const workTypeChart = Object.entries(byWorkType).map(([label, value]) => ({
      label: workTypeLabels[label] ?? "기타",
      value,
    }));

    const statusChart = [
      { label: "대기", value: (data ?? []).filter((t) => (t.status || "").toLowerCase() === "open").length },
      { label: "진행", value: (data ?? []).filter((t) => (t.status || "").toLowerCase() === "in_progress").length },
      { label: "완료", value: (data ?? []).filter((t) => (t.status || "").toLowerCase() === "resolved").length },
      { label: "사업검토", value: (data ?? []).filter((t) => (t.status || "").toLowerCase() === "closed").length },
    ];

    return { todayNew, todayDone, totalPending, categoryChart, statusChart, workTypeChart };
  }, [data, categories, categoryMap]);

  const rangeSeries = useMemo(() => {
    const tickets = data ?? [];
    const now = startOfDay(new Date());

    if (range === "monthly") {
      const labels: string[] = [];
      const counts: Record<string, number> = {};
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = formatMonthKey(d);
        labels.push(key);
        counts[key] = 0;
      }
      tickets.forEach((t) => {
        if (!t.created_at) return;
        const d = new Date(t.created_at);
        const key = formatMonthKey(d);
        if (key in counts) counts[key] += 1;
      });
      return { labels, values: labels.map((l) => counts[l]) };
    }

    if (range === "weekly") {
      const labels: string[] = [];
      const counts: Record<string, number> = {};
      for (let i = 51; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i * 7);
        const key = formatWeekKey(d);
        labels.push(key);
        counts[key] = 0;
      }
      tickets.forEach((t) => {
        if (!t.created_at) return;
        const key = formatWeekKey(new Date(t.created_at));
        if (key in counts) counts[key] += 1;
      });
      return { labels, values: labels.map((l) => counts[l]) };
    }

    const labels: string[] = [];
    const counts: Record<string, number> = {};
    for (let i = 364; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = formatDateKey(d);
      labels.push(key);
      counts[key] = 0;
    }
    tickets.forEach((t) => {
      if (!t.created_at) return;
      const key = formatDateKey(new Date(t.created_at));
      if (key in counts) counts[key] += 1;
    });
    return { labels, values: labels.map((l) => counts[l]) };
  }, [data, range]);

  const cards = [
    { title: "사용자관리", desc: "계정 상태/권한, 기본 정보 관리", href: "/admin/users", accent: "bg-emerald-50 border-emerald-100 text-emerald-800" },
    { title: "요청관리", desc: "모든 요청 조회 및 담당자 배정", href: "/admin/tickets", accent: "bg-sky-50 border-sky-100 text-sky-800" },
  ];

  return (
    <div className="p-6 space-y-5">
      <div>
        <div className="text-xs text-gray-500">ADMIN</div>
        <h1 className="text-2xl font-semibold">관리자 대시보드</h1>
        <p className="text-sm text-gray-500 mt-1">관리 업무 현황과 통계를 한눈에 확인하세요.</p>
      </div>

      <ErrorDialog message={errorMessage} onClose={() => setErrorMessage(null)} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard label="금일 접수" value={isLoading ? "-" : stats.todayNew} accent />
        <StatCard label="금일 처리" value={isLoading ? "-" : stats.todayDone} />
        <StatCard label="미처리 총 요청" value={isLoading ? "-" : stats.totalPending} />
      </div>

      <div className="rounded-xl border bg-white shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-gray-800">접수된 요청 수</div>
          <div className="flex items-center gap-2">
            {(["daily", "weekly", "monthly"] as const).map((r) => (
              <button
                key={r}
                type="button"
                className={`px-3 py-1.5 rounded-lg text-sm ${
                  range === r ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
                onClick={() => setRange(r)}
              >
                {r === "daily" ? "일별" : r === "weekly" ? "주별" : "월별"}
              </button>
            ))}
          </div>
        </div>
        <AreaLineChart title="최근 1년 추이" labels={rangeSeries.labels} values={rangeSeries.values} faded={fade} />
      </div>

      <div className="space-y-4">
        <VerticalBarChart title="카테고리별 요청" data={stats.categoryChart} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <VerticalBarChart title="상태별 요청" data={stats.statusChart} />
          <VerticalBarChart title="작업 구분별 요청" data={stats.workTypeChart} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {cards.map((c) => (
          <Link
            key={c.title}
            href={c.href}
            className={`rounded-xl border p-4 shadow-sm hover:shadow transition flex items-center justify-between ${c.accent}`}
          >
            <div>
              <div className="text-lg font-semibold">{c.title}</div>
              <div className="text-sm text-gray-700 mt-1">{c.desc}</div>
            </div>
            <span className="text-sm text-gray-600">이동 →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
