"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useTicketCategories } from "@/lib/use-ticket-categories";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui";
import { Download, BarChart3, ArrowLeft, ChevronDown } from "lucide-react";

type Ticket = {
  id: number;
  title: string;
  status: string;
  priority: string;
  work_type?: string | null;
  category_id?: number | null;
  category_ids?: number[];
  project_id?: number | null;
  project_name?: string | null;
  requester_emp_no: string;
  assignee_emp_no?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  reopen_count?: number;
  requester?: { kor_name?: string | null; title?: string | null; department?: string | null } | null;
  assignee?: { kor_name?: string | null } | null;
  assignees?: { kor_name?: string | null }[] | null;
};

type ColDef =
  | { key: string; label: string; section: string; hasDataFilter: false }
  | { key: string; label: string; section: string; hasDataFilter: true }
  | { key: string; label: string; section: string; hasDataFilter: "created_at" };

const SECTION_ORDER = ["기본정보", "프로젝트·분류", "요청자", "담당", "일시·재요청"] as const;

const COLUMN_DEFS: ColDef[] = [
  { key: "id", label: "ID", section: "기본정보", hasDataFilter: false },
  { key: "title", label: "제목", section: "기본정보", hasDataFilter: false },
  { key: "status", label: "상태", section: "기본정보", hasDataFilter: true },
  { key: "priority", label: "우선순위", section: "기본정보", hasDataFilter: true },
  { key: "work_type", label: "작업유형", section: "기본정보", hasDataFilter: true },
  { key: "project_name", label: "프로젝트", section: "프로젝트·분류", hasDataFilter: true },
  { key: "category_display", label: "카테고리", section: "프로젝트·분류", hasDataFilter: true },
  { key: "requester_name", label: "요청자 이름", section: "요청자", hasDataFilter: false },
  { key: "requester_title", label: "요청자 직급", section: "요청자", hasDataFilter: true },
  { key: "requester_department", label: "요청자 부서", section: "요청자", hasDataFilter: true },
  { key: "assignee_display", label: "담당자", section: "담당", hasDataFilter: true },
  { key: "created_at", label: "생성일시", section: "일시·재요청", hasDataFilter: "created_at" },
  { key: "updated_at", label: "수정일시", section: "일시·재요청", hasDataFilter: false },
  { key: "reopen_count", label: "재요청 횟수", section: "일시·재요청", hasDataFilter: false },
];

const STATUS_LABELS: Record<string, string> = {
  open: "접수",
  in_progress: "진행",
  resolved: "완료",
  closed: "사업검토",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "낮음",
  medium: "보통",
  high: "높음",
};

const WORK_TYPE_LABELS: Record<string, string> = {
  incident: "장애",
  request: "요청",
  change: "변경",
  other: "기타",
};

function getValue(
  t: Ticket,
  key: string,
  opts?: { categoryMap?: Record<number, string> }
): string {
  if (key === "requester_name") return t.requester?.kor_name ?? t.requester_emp_no ?? "-";
  if (key === "requester_title") return t.requester?.title ?? "-";
  if (key === "requester_department") return t.requester?.department ?? "-";
  if (key === "category_display") {
    const ids = t.category_ids ?? (t.category_id != null ? [t.category_id] : []);
    const map = opts?.categoryMap ?? {};
    const names = ids.map((id) => map[id] ?? String(id)).filter(Boolean);
    return names.length ? names.join(", ") : "-";
  }
  if (key === "assignee_display") {
    const list = t.assignees ?? (t.assignee ? [t.assignee] : []);
    const names = list.map((a) => a?.kor_name).filter(Boolean);
    return names.length ? names.join(", ") : t.assignee_emp_no ?? "-";
  }
  if (key === "work_type") {
    const raw = t.work_type;
    if (raw == null || raw === "") return "-";
    return WORK_TYPE_LABELS[raw] ?? raw;
  }
  if (key === "updated_at") {
    const raw = t.updated_at;
    if (raw == null) return "-";
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" });
  }
  if (key === "reopen_count") return String(t.reopen_count ?? 0);
  const v = (t as Record<string, unknown>)[key];
  if (v == null) return "-";
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v.join(", ");
  return String(v);
}

function dayOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
}

/** 0~100 퍼센트를 해당 연도의 일(1~366)로 변환 후 "M/d" 형식으로 표시 (비윤년 기준) */
function formatDayOfYearPercent(pct: number): string {
  const day = Math.min(366, Math.max(1, Math.round(1 + (365 * pct) / 100)));
  const d = new Date(2024, 0, day);
  return d.toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" });
}

function escapeCsvCell(s: string): string {
  if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function DateRangeBar({
  value: [start, end],
  onChange,
}: {
  value: [number, number];
  onChange: (v: [number, number]) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<"start" | "end" | null>(null);

  const pctFromClientX = useCallback((clientX: number) => {
    const el = trackRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    return Math.max(0, Math.min(100, pct));
  }, []);

  const onPointerDown = useCallback(
    (which: "start" | "end") => (e: React.PointerEvent) => {
      e.preventDefault();
      dragging.current = which;
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    []
  );
  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (dragging.current === null) return;
      const pct = pctFromClientX(e.clientX);
      if (dragging.current === "start") {
        onChange([Math.min(pct, end), end]);
      } else {
        onChange([start, Math.max(pct, start)]);
      }
    },
    [start, end, onChange, pctFromClientX]
  );
  const onPointerUp = useCallback((e: React.PointerEvent) => {
    dragging.current = null;
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
  }, []);

  return (
    <div className="space-y-2">
      <div className="relative h-8 flex items-center" ref={trackRef}>
        <div
          className="absolute left-0 right-0 h-2 rounded-full"
          style={{ backgroundColor: "var(--bg-subtle)" }}
        />
        <div
          className="absolute h-2 rounded-full pointer-events-none"
          style={{
            left: `${start}%`,
            width: `${end - start}%`,
            backgroundColor: "var(--color-primary-500)",
          }}
        />
        <div
          role="slider"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={start}
          tabIndex={0}
          className="absolute w-5 h-5 rounded-full border-2 cursor-grab active:cursor-grabbing touch-none"
          style={{
            left: `calc(${start}% - 10px)`,
            top: "50%",
            transform: "translateY(-50%)",
            backgroundColor: "var(--bg-card)",
            borderColor: "var(--color-primary-500)",
          }}
          onPointerDown={onPointerDown("start")}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        />
        <div
          role="slider"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={end}
          tabIndex={0}
          className="absolute w-5 h-5 rounded-full border-2 cursor-grab active:cursor-grabbing touch-none"
          style={{
            left: `calc(${end}% - 10px)`,
            top: "50%",
            transform: "translateY(-50%)",
            backgroundColor: "var(--bg-card)",
            borderColor: "var(--color-primary-500)",
          }}
          onPointerDown={onPointerDown("end")}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        />
      </div>
      <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
        손잡이를 드래그해 1년 중 포함할 기간(월·일)을 설정하세요.
      </p>
    </div>
  );
}

export default function AdminDataPage() {
  const { map: categoryMap = {} } = useTicketCategories();
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(
    () => new Set(COLUMN_DEFS.map((c) => c.key))
  );
  const [dataFilters, setDataFilters] = useState<Record<string, Set<string>>>({});
  const [createdDayRangePercent, setCreatedDayRangePercent] = useState<[number, number]>([0, 100]);
  const [showColumnPicker, setShowColumnPicker] = useState(true);

  const { data: tickets = [], isLoading, error } = useQuery({
    queryKey: ["tickets", "all", 1000],
    queryFn: () => api<Ticket[]>("/tickets?scope=all&limit=1000"),
  });

  const { distinctValues, createdYearValues } = useMemo(() => {
    const dv: Record<string, string[]> = {};
    const statusSet = new Set<string>();
    const prioritySet = new Set<string>();
    const workTypeSet = new Set<string>();
    const projectSet = new Set<string>();
    const categorySet = new Set<string>();
    const requesterTitleSet = new Set<string>();
    const requesterDeptSet = new Set<string>();
    const assigneeSet = new Set<string>();
    const yearSet = new Set<number>();

    for (const t of tickets) {
      if (t.status) statusSet.add(t.status);
      if (t.priority) prioritySet.add(t.priority);
      const wt = t.work_type || "-";
      workTypeSet.add(wt);
      const pn = t.project_name || "-";
      projectSet.add(pn);
      categorySet.add(getValue(t, "category_display", { categoryMap }));
      const rt = t.requester?.title ?? "-";
      requesterTitleSet.add(rt);
      const rd = t.requester?.department ?? "-";
      requesterDeptSet.add(rd);
      assigneeSet.add(getValue(t, "assignee_display"));

      if (t.created_at) {
        const d = new Date(t.created_at);
        if (!Number.isNaN(d.getTime())) yearSet.add(d.getFullYear());
      }
    }

    dv.status = Array.from(statusSet).sort();
    dv.priority = Array.from(prioritySet).sort();
    dv.work_type = Array.from(workTypeSet).sort((a, b) => (a === "-" ? 1 : b === "-" ? -1 : a.localeCompare(b)));
    dv.project_name = Array.from(projectSet).sort((a, b) => (a === "-" ? 1 : b === "-" ? -1 : a.localeCompare(b)));
    dv.category_display = Array.from(categorySet).filter((x) => x !== "-").sort((a, b) => a.localeCompare(b));
    dv.requester_title = Array.from(requesterTitleSet).sort((a, b) => (a === "-" ? 1 : b === "-" ? -1 : a.localeCompare(b)));
    dv.requester_department = Array.from(requesterDeptSet).sort((a, b) => (a === "-" ? 1 : b === "-" ? -1 : a.localeCompare(b)));
    dv.assignee_display = Array.from(assigneeSet).filter((x) => x !== "-").sort();
    dv.created_at_year = Array.from(yearSet).sort((a, b) => a - b).map(String);

    return { distinctValues: dv, createdYearValues: dv.created_at_year };
  }, [tickets, categoryMap]);

  const filteredTickets = useMemo(() => {
    const [startPct, endPct] = createdDayRangePercent;
    const startDay = Math.round(1 + (365 * startPct) / 100);
    const endDay = Math.round(1 + (365 * endPct) / 100);
    const yearIncluded = dataFilters["created_at_year"];

    return tickets.filter((t) => {
      for (const col of COLUMN_DEFS) {
        if (col.hasDataFilter === false) continue;
        if (col.hasDataFilter === "created_at" && col.key === "created_at") {
          if (!t.created_at) return false;
          const d = new Date(t.created_at);
          if (Number.isNaN(d.getTime())) return false;
          if (yearIncluded?.size && !yearIncluded.has(String(d.getFullYear()))) return false;
          const doy = dayOfYear(d);
          if (doy < startDay || doy > endDay) return false;
        } else if (col.hasDataFilter === true) {
          const excluded = dataFilters[col.key];
          if (!excluded?.size) continue;
          const val = getValue(t, col.key, { categoryMap }) || "-";
          if (excluded.has(val)) return false;
        }
      }
      return true;
    });
  }, [tickets, dataFilters, createdDayRangePercent, categoryMap]);

  const toggleColumn = (key: string) => {
    setSelectedColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleDataFilter = (colKey: string, value: string) => {
    setDataFilters((prev) => {
      const next = { ...prev };
      const set = new Set(next[colKey] ?? []);
      if (set.has(value)) set.delete(value);
      else set.add(value);
      next[colKey] = set;
      return next;
    });
  };

  const handleExportCsv = () => {
    const cols = COLUMN_DEFS.filter((c) => selectedColumns.has(c.key));
    const headers = cols.map((c) => c.label);
    const rows = filteredTickets.map((t) =>
      cols.map((c) => escapeCsvCell(getValue(t, c.key, { categoryMap }))).join(",")
    );
    const csv = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `it-desk-tickets-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const visibleColDefs = useMemo(
    () => COLUMN_DEFS.filter((c) => selectedColumns.has(c.key)),
    [selectedColumns]
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      <PageHeader
        title="데이터 추출"
        subtitle="티켓 메타정보를 확인하고 엑셀(CSV)로 다운로드할 수 있습니다"
        icon={<BarChart3 className="h-7 w-7" strokeWidth={2} />}
      />

      <div className="flex flex-wrap items-center gap-4">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
          style={{
            borderColor: "var(--border-default)",
            backgroundColor: "var(--bg-card)",
            color: "var(--text-secondary)",
          }}
        >
          <ArrowLeft className="h-4 w-4" />
          대시보드로
        </Link>
        <button
          type="button"
          onClick={() => setShowColumnPicker((p) => !p)}
          className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
          style={{
            borderColor: "var(--border-default)",
            backgroundColor: showColumnPicker ? "var(--bg-selected)" : "var(--bg-card)",
            color: "var(--text-primary)",
          }}
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${showColumnPicker ? "rotate-180" : ""}`} />
          컬럼/데이터 선택
        </button>
        <button
          type="button"
          onClick={handleExportCsv}
          disabled={visibleColDefs.length === 0 || filteredTickets.length === 0}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50"
          style={{
            background: "linear-gradient(135deg, var(--color-primary-600) 0%, var(--color-primary-700) 100%)",
          }}
        >
          <Download className="h-4 w-4" />
          CSV 다운로드
        </button>
      </div>

      {showColumnPicker && (
        <Card padding="lg">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <p className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
              컬럼 선택: 표시할 항목을 체크하세요. 우측 필터: 포함할 값만 체크 (비워두면 전체 포함)
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedColumns(new Set(COLUMN_DEFS.map((c) => c.key)))}
                className="text-xs font-medium px-2 py-1 rounded border"
                style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)", backgroundColor: "var(--bg-card)" }}
              >
                전체 선택
              </button>
              <button
                type="button"
                onClick={() => setSelectedColumns(new Set())}
                className="text-xs font-medium px-2 py-1 rounded border"
                style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)", backgroundColor: "var(--bg-card)" }}
              >
                전체 해제
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-[700px] space-y-6">
              {SECTION_ORDER.map((sectionName) => {
                const cols = COLUMN_DEFS.filter((c) => c.section === sectionName);
                if (cols.length === 0) return null;
                return (
                  <div key={sectionName}>
                    <h3
                      className="text-xs font-semibold uppercase tracking-wide mb-2 pb-1 border-b"
                      style={{ color: "var(--text-tertiary)", borderColor: "var(--border-default)" }}
                    >
                      {sectionName}
                    </h3>
                    <div className="space-y-2">
                      {cols.map((col) => (
                        <div
                          key={col.key}
                          className="flex items-start gap-4 py-2 border-b last:border-b-0"
                          style={{ borderColor: "var(--border-subtle)" }}
                        >
                          <div className="w-32 shrink-0 flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={selectedColumns.has(col.key)}
                              onChange={() => toggleColumn(col.key)}
                              className="rounded"
                            />
                            <span className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>
                              {col.label}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            {col.hasDataFilter === false && (
                              <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                                필터 없음
                              </span>
                            )}
                            {col.hasDataFilter === true && (
                              <div className="flex flex-wrap gap-2">
                                {(distinctValues[col.key] ?? []).map((v) => {
                                  const label =
                                    col.key === "status"
                                      ? STATUS_LABELS[v] ?? v
                                      : col.key === "priority"
                                        ? PRIORITY_LABELS[v] ?? v
                                        : col.key === "work_type"
                                          ? WORK_TYPE_LABELS[v] ?? v
                                          : v;
                                  const excluded = dataFilters[col.key];
                                  const checked = !excluded?.has(v);
                                  return (
                                    <label
                                      key={v}
                                      className="inline-flex items-center gap-1.5 cursor-pointer text-sm"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => toggleDataFilter(col.key, v)}
                                        className="rounded"
                                      />
                                      <span style={{ color: "var(--text-primary)" }}>{label}</span>
                                    </label>
                                  );
                                })}
                                {(!distinctValues[col.key] || distinctValues[col.key].length === 0) && (
                                  <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>데이터 없음</span>
                                )}
                              </div>
                            )}
                            {col.hasDataFilter === "created_at" && col.key === "created_at" && (
                              <div className="space-y-3">
                                <div>
                                  <div className="text-xs font-medium mb-1.5" style={{ color: "var(--text-tertiary)" }}>
                                    년도 (체크한 연도만 포함)
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {(distinctValues.created_at_year ?? []).map((yearStr) => {
                                      const excluded = dataFilters["created_at_year"];
                                      const checked = !excluded?.has(yearStr);
                                      return (
                                        <label
                                          key={yearStr}
                                          className="inline-flex items-center gap-1.5 cursor-pointer text-sm"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => toggleDataFilter("created_at_year", yearStr)}
                                            className="rounded"
                                          />
                                          <span style={{ color: "var(--text-primary)" }}>{yearStr}년</span>
                                        </label>
                                      );
                                    })}
                                    {(!distinctValues.created_at_year || distinctValues.created_at_year.length === 0) && (
                                      <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>데이터 없음</span>
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <div className="flex items-center justify-between gap-2 text-xs mb-1.5" style={{ color: "var(--text-tertiary)" }}>
                                    <span>월·일 범위: {formatDayOfYearPercent(createdDayRangePercent[0])} ~ {formatDayOfYearPercent(createdDayRangePercent[1])}</span>
                                  </div>
                                  <DateRangeBar value={createdDayRangePercent} onChange={setCreatedDayRangePercent} />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
        표시 중: <strong style={{ color: "var(--text-primary)" }}>{filteredTickets.length}</strong>건
        {filteredTickets.length !== tickets.length && ` (전체 ${tickets.length}건 중 필터 적용)`}
      </div>

      <Card padding="none">
        {isLoading && (
          <div className="py-12 text-center text-sm" style={{ color: "var(--text-tertiary)" }}>
            로딩 중...
          </div>
        )}
        {error && (
          <div className="py-12 text-center text-sm" style={{ color: "var(--color-danger-600)" }}>
            데이터를 불러오지 못했습니다.
          </div>
        )}
        {!isLoading && !error && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-default)", backgroundColor: "var(--bg-elevated)" }}>
                  {visibleColDefs.map((c) => (
                    <th key={c.key} className="px-4 py-3 font-semibold" style={{ color: "var(--text-secondary)" }}>
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredTickets.length === 0 && (
                  <tr>
                    <td colSpan={visibleColDefs.length} className="px-4 py-8 text-center" style={{ color: "var(--text-tertiary)" }}>
                      {tickets.length === 0 ? "티켓 데이터가 없습니다." : "조건에 맞는 티켓이 없습니다. 필터를 조정해 보세요."}
                    </td>
                  </tr>
                )}
                {filteredTickets.map((t) => (
                  <tr key={t.id} style={{ borderBottom: "1px solid var(--border-default)" }}>
                    {visibleColDefs.map((c) => (
                      <td key={c.key} className="px-4 py-2.5 max-w-[200px] truncate" style={{ color: "var(--text-primary)" }}>
                        {getValue(t, c.key, { categoryMap })}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
