"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
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
  requester?: { kor_name?: string | null; title?: string | null; department?: string | null } | null;
  assignee?: { kor_name?: string | null } | null;
  assignees?: { kor_name?: string | null }[] | null;
};

type ColDef =
  | { key: string; label: string; hasDataFilter: false }
  | { key: string; label: string; hasDataFilter: true }
  | { key: string; label: string; hasDataFilter: "datetime"; parts: ("year" | "month" | "day" | "hour")[] };

const COLUMN_DEFS: ColDef[] = [
  { key: "id", label: "ID", hasDataFilter: false },
  { key: "title", label: "제목", hasDataFilter: false },
  { key: "status", label: "상태", hasDataFilter: true },
  { key: "priority", label: "우선순위", hasDataFilter: true },
  { key: "work_type", label: "작업유형", hasDataFilter: true },
  { key: "project_name", label: "프로젝트", hasDataFilter: true },
  { key: "requester_display", label: "요청자", hasDataFilter: true },
  { key: "assignee_display", label: "담당자", hasDataFilter: true },
  { key: "created_at", label: "생성일시", hasDataFilter: "datetime", parts: ["year", "month", "day", "hour"] },
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

function getValue(t: Ticket, key: string): string {
  if (key === "requester_display") {
    const r = t.requester;
    if (!r) return t.requester_emp_no;
    const parts = [r.kor_name, r.title, r.department].filter(Boolean);
    return parts.length ? parts.join(" / ") : t.requester_emp_no;
  }
  if (key === "assignee_display") {
    const list = t.assignees ?? (t.assignee ? [t.assignee] : []);
    const names = list.map((a) => a?.kor_name).filter(Boolean);
    return names.length ? names.join(", ") : t.assignee_emp_no ?? "-";
  }
  const v = (t as Record<string, unknown>)[key];
  if (v == null) return "-";
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v.join(", ");
  return String(v);
}

function parseDatetime(val: string | null | undefined): { y: number; m: number; d: number; h: number } | null {
  if (!val) return null;
  const dt = new Date(val);
  if (Number.isNaN(dt.getTime())) return null;
  return {
    y: dt.getFullYear(),
    m: dt.getMonth() + 1,
    d: dt.getDate(),
    h: dt.getHours(),
  };
}

function escapeCsvCell(s: string): string {
  if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export default function AdminDataPage() {
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(
    new Set(["id", "title", "status", "priority", "created_at"])
  );
  const [dataFilters, setDataFilters] = useState<Record<string, Set<string>>>({});
  const [showColumnPicker, setShowColumnPicker] = useState(true);

  const { data: tickets = [], isLoading, error } = useQuery({
    queryKey: ["tickets", "all", 1000],
    queryFn: () => api<Ticket[]>("/tickets?scope=all&limit=1000"),
  });

  const { distinctValues, datetimeValues } = useMemo(() => {
    const dv: Record<string, string[]> = {};
    const dtv: Record<string, { year: number[]; month: number[]; day: number[]; hour: number[] }> = {};
    const statusSet = new Set<string>();
    const prioritySet = new Set<string>();
    const workTypeSet = new Set<string>();
    const projectSet = new Set<string>();
    const requesterSet = new Set<string>();
    const assigneeSet = new Set<string>();
    const createdY = new Set<number>();
    const createdM = new Set<number>();
    const createdD = new Set<number>();
    const createdH = new Set<number>();

    for (const t of tickets) {
      if (t.status) statusSet.add(t.status);
      if (t.priority) prioritySet.add(t.priority);
      const wt = t.work_type || "-";
      workTypeSet.add(wt);
      const pn = t.project_name || "-";
      projectSet.add(pn);
      requesterSet.add(getValue(t, "requester_display"));
      assigneeSet.add(getValue(t, "assignee_display"));

      const created = parseDatetime(t.created_at);
      if (created) {
        createdY.add(created.y);
        createdM.add(created.m);
        createdD.add(created.d);
        createdH.add(created.h);
      }
    }

    dv.status = Array.from(statusSet).sort();
    dv.priority = Array.from(prioritySet).sort();
    dv.work_type = Array.from(workTypeSet).sort((a, b) => (a === "-" ? 1 : b === "-" ? -1 : a.localeCompare(b)));
    dv.project_name = Array.from(projectSet).sort((a, b) => (a === "-" ? 1 : b === "-" ? -1 : a.localeCompare(b)));
    dv.requester_display = Array.from(requesterSet).filter((x) => x !== "-").sort();
    dv.assignee_display = Array.from(assigneeSet).filter((x) => x !== "-").sort();

    dtv.created_at = {
      year: Array.from(createdY).sort((a, b) => a - b),
      month: Array.from(createdM).sort((a, b) => a - b),
      day: Array.from(createdD).sort((a, b) => a - b),
      hour: Array.from(createdH).sort((a, b) => a - b),
    };

    return { distinctValues: dv, datetimeValues: dtv };
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      for (const col of COLUMN_DEFS) {
        if (col.hasDataFilter === false) continue;
        if (col.hasDataFilter === "datetime" && "parts" in col) {
          const dt = parseDatetime((t as Record<string, unknown>)[col.key] as string);
          if (!dt) continue;
          const base = `${col.key}_`;
          const excludedY = dataFilters[`${base}year`];
          const excludedM = dataFilters[`${base}month`];
          const excludedD = dataFilters[`${base}day`];
          const excludedH = dataFilters[`${base}hour`];
          if (excludedY?.size && excludedY.has(String(dt.y))) return false;
          if (excludedM?.size && excludedM.has(String(dt.m))) return false;
          if (excludedD?.size && excludedD.has(String(dt.d))) return false;
          if (excludedH?.size && excludedH.has(String(dt.h))) return false;
        } else if (col.hasDataFilter === true) {
          const excluded = dataFilters[col.key];
          if (!excluded?.size) continue;
          const val = getValue(t, col.key) || "-";
          if (excluded.has(val)) return false;
        }
      }
      return true;
    });
  }, [tickets, dataFilters]);

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
      cols.map((c) => escapeCsvCell(getValue(t, c.key))).join(",")
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
          <div className="text-sm font-semibold mb-4" style={{ color: "var(--text-secondary)" }}>
            좌측: 컬럼 선택 · 우측: 데이터 필터 (선택 시 해당 값만 포함)
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-[700px] space-y-3">
              {COLUMN_DEFS.map((col) => (
                <div
                  key={col.key}
                  className="flex items-start gap-4 py-2 border-b last:border-b-0"
                  style={{ borderColor: "var(--border-default)" }}
                >
                  <div className="w-28 shrink-0 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedColumns.has(col.key)}
                      onChange={() => toggleColumn(col.key)}
                      className="rounded"
                    />
                    <span className="font-medium" style={{ color: "var(--text-primary)" }}>
                      {col.label}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    {col.hasDataFilter === false && (
                      <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                        고유값 · 데이터 선택 없음
                      </span>
                    )}
                    {col.hasDataFilter === true && (
                      <div className="flex flex-wrap gap-2">
                        {(distinctValues[col.key] ?? []).map((v) => {
                          const label = col.key === "status" ? STATUS_LABELS[v] ?? v : col.key === "priority" ? PRIORITY_LABELS[v] ?? v : v;
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
                    {col.hasDataFilter === "datetime" && "parts" in col && (
                      <div className="grid grid-cols-4 gap-2">
                        {(["year", "month", "day", "hour"] as const).map((part) => {
                          const partLabel = { year: "년", month: "월", day: "일", hour: "시" }[part];
                          const vals = datetimeValues[col.key]?.[part] ?? [];
                          const fKey = `${col.key}_${part}`;
                          const excluded = dataFilters[fKey];
                          return (
                            <div key={part}>
                              <div className="text-xs font-medium mb-1" style={{ color: "var(--text-tertiary)" }}>
                                {partLabel}
                              </div>
                              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                                {vals.map((n) => {
                                  const checked = !excluded?.has(String(n));
                                  return (
                                    <label key={n} className="inline-flex items-center gap-1 cursor-pointer text-xs">
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => toggleDataFilter(fKey, String(n))}
                                        className="rounded"
                                      />
                                      <span style={{ color: "var(--text-primary)" }}>{n}</span>
                                    </label>
                                  );
                                })}
                                {vals.length === 0 && (
                                  <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>-</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
        필터 결과: {filteredTickets.length}건 / 전체 {tickets.length}건
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
                      데이터가 없습니다.
                    </td>
                  </tr>
                )}
                {filteredTickets.map((t) => (
                  <tr key={t.id} style={{ borderBottom: "1px solid var(--border-default)" }}>
                    {visibleColDefs.map((c) => (
                      <td key={c.key} className="px-4 py-2.5 max-w-[200px] truncate" style={{ color: "var(--text-primary)" }}>
                        {getValue(t, c.key)}
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
