"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMe } from "@/lib/auth-context";
import { api } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import Pagination from "@/components/Pagination";
import ErrorDialog from "@/components/ErrorDialog";
import { Card, Badge } from "@/components/ui";
import { Search, X, UserCog } from "lucide-react";

type Role = "requester" | "admin";
type SortDir = "asc" | "desc";
type SortKey = "emp_no" | "kor_name" | "title" | "department" | "pending_total";

type UserRow = {
  emp_no: string;
  kor_name?: string | null;
  title?: string | null;
  department?: string | null;
  pending: number;
  total: number;
  role: Role;
};

function RoleBadge({ role }: { role: Role }) {
  const variant = role === "admin" ? "success" : "default";
  return <Badge variant={variant} size="sm">{role}</Badge>;
}

export default function AdminUsersPage() {
  const me = useMe();
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("department");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [adminSearch, setAdminSearch] = useState("");

  const canChangeRole = me.role === "admin";

  useEffect(() => {
    if (me.role !== "admin") {
      router.replace("/home");
      return;
    }

    let alive = true;
    setLoading(true);
    api<UserRow[]>("/admin/users")
      .then((data) => {
        if (!alive) return;
        setUsers(data);
        setError(null);
      })
      .catch((e: any) => {
        if (!alive) return;
        setError(e.message ?? "사용자 목록을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [me.role, router]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter((u) => {
      const name = (u.kor_name ?? "").toLowerCase();
      const title = (u.title ?? "").toLowerCase();
      const dept = (u.department ?? "").toLowerCase();
      const emp = (u.emp_no ?? "").toLowerCase();
      return name.includes(term) || title.includes(term) || dept.includes(term) || emp.includes(term);
    });
  }, [users, search]);

  const sorted = useMemo(() => {
    const compareText = (a?: string | null, b?: string | null) => {
      const aa = (a ?? "").toLowerCase();
      const bb = (b ?? "").toLowerCase();
      return aa.localeCompare(bb);
    };

    const base = [...filtered].sort((a, b) => {
      if (sortKey === "emp_no") return compareText(a.emp_no, b.emp_no);
      if (sortKey === "kor_name") return compareText(a.kor_name, b.kor_name);
      if (sortKey === "title") return compareText(a.title, b.title);
      if (sortKey === "department") return compareText(a.department, b.department);
      if (sortKey === "pending_total") {
        if (a.pending !== b.pending) return a.pending - b.pending;
        return a.total - b.total;
      }
      return 0;
    });

    return sortDir === "asc" ? base : base.reverse();
  }, [filtered, sortDir, sortKey]);

  const pageSize = 20;
  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [page, sorted]);

  useEffect(() => {
    setPage(1);
  }, [search, sortKey, sortDir, users.length]);

  const admins = useMemo(() => users.filter((u) => u.role === "admin"), [users]);

  const adminCandidates = useMemo(() => {
    const term = adminSearch.trim().toLowerCase();
    if (!term) return users;
    return users.filter((u) => {
      const name = (u.kor_name ?? "").toLowerCase();
      const title = (u.title ?? "").toLowerCase();
      const dept = (u.department ?? "").toLowerCase();
      const emp = (u.emp_no ?? "").toLowerCase();
      return name.includes(term) || title.includes(term) || dept.includes(term) || emp.includes(term);
    });
  }, [adminSearch, users]);

  const handleRoleChange = async (empNo: string, role: Role) => {
    if (!canChangeRole) return;
    setSavingId(empNo);
    try {
      const updated = await api<UserRow>(`/admin/users/${empNo}/role`, {
        method: "PATCH",
        body: { role },
      });
      setUsers((prev) => prev.map((u) => (u.emp_no === empNo ? updated : u)));
    } catch (e: any) {
      setError(e.message ?? "권한 변경에 실패했습니다.");
    } finally {
      setSavingId(null);
    }
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  };

  const renderSortLabel = (key: SortKey, label: string) => {
    const active = sortKey === key;
    const arrow = active ? (sortDir === "asc" ? "▲" : "▼") : "↕";
    return (
      <button
        type="button"
        className="inline-flex items-center gap-1 transition-colors"
        style={{
          color: active ? "var(--text-primary)" : "var(--text-secondary)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "var(--text-primary)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = active ? "var(--text-primary)" : "var(--text-secondary)";
        }}
        onClick={() => toggleSort(key)}
      >
        <span>{label}</span>
        <span className="text-[10px]">{arrow}</span>
      </button>
    );
  };

  if (me.role !== "admin") {
    return null;
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <PageHeader
        title="사용자 관리"
        subtitle="권한 설정과 기본 정보를 관리합니다."
        icon="👥"
        actions={
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: "var(--text-tertiary)" }}
            />
            <input
              className="border rounded-lg pl-10 pr-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 transition-all"
              style={{
                borderColor: "var(--border-default)",
                backgroundColor: "var(--bg-card)",
                color: "var(--text-primary)",
              }}
              placeholder="이름/직급/부서/직책/ID 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        }
      />

      <ErrorDialog message={error} onClose={() => setError(null)} />

      <Card padding="none" className="overflow-hidden">
        <table className="w-full text-sm">
          <thead style={{ backgroundColor: "var(--bg-subtle)" }}>
            <tr style={{ borderBottom: "1px solid var(--border-default)" }}>
              <th className="text-left p-3 w-28">{renderSortLabel("emp_no", "ID")}</th>
              <th className="text-left p-3 w-28">{renderSortLabel("kor_name", "이름")}</th>
              <th className="text-left p-3 w-28">{renderSortLabel("title", "직급")}</th>
              <th className="text-left p-3 w-40">{renderSortLabel("department", "부서/직책")}</th>
              <th className="text-left p-3 w-40">
                {renderSortLabel("pending_total", "미처리/등록 요청")}
              </th>
              <th className="text-left p-3 w-20">관리</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr style={{ borderTop: "1px solid var(--border-subtle)" }}>
                <td className="p-3" style={{ color: "var(--text-secondary)" }} colSpan={6}>
                  사용자 목록을 불러오는 중입니다...
                </td>
              </tr>
            )}
            {!loading &&
              paged.map((u) => (
                <tr
                  key={u.emp_no}
                  className="transition-colors"
                  style={{ borderTop: "1px solid var(--border-subtle)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--bg-hover)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <td className="p-3 font-medium" style={{ color: "var(--text-primary)" }}>
                    {u.emp_no || "-"}
                  </td>
                  <td className="p-3 font-medium" style={{ color: "var(--text-primary)" }}>
                    {u.kor_name || "-"}
                  </td>
                  <td className="p-3" style={{ color: "var(--text-secondary)" }}>
                    {u.title || "-"}
                  </td>
                  <td className="p-3" style={{ color: "var(--text-secondary)" }}>
                    {u.department || "-"}
                  </td>
                  <td className="p-3" style={{ color: "var(--text-secondary)" }}>
                    <span className="font-semibold" style={{ color: "var(--color-warning-700)" }}>
                      {u.pending}
                    </span>
                    <span style={{ color: "var(--text-tertiary)" }}> / </span>
                    <span>{u.total}</span>
                  </td>
                  <td className="p-3" style={{ color: "var(--text-tertiary)" }}>
                    -
                  </td>
                </tr>
              ))}
            {!loading && !paged.length && (
              <tr style={{ borderTop: "1px solid var(--border-subtle)" }}>
                <td className="p-3" style={{ color: "var(--text-secondary)" }} colSpan={6}>
                  검색 결과가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <div className="flex items-center justify-between">
        <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
          총 <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{sorted.length}</span>명
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-all"
          style={{
            borderColor: "var(--border-default)",
            backgroundColor: "var(--bg-card)",
            color: "var(--text-primary)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "var(--bg-hover)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "var(--bg-card)";
          }}
          onClick={() => setAdminModalOpen(true)}
          disabled={!canChangeRole}
        >
          <UserCog className="w-4 h-4" />
          관리자 설정
        </button>
      </div>

      <Pagination page={page} total={sorted.length} pageSize={pageSize} onChange={setPage} />

      {adminModalOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
            onClick={() => setAdminModalOpen(false)}
          />
          <div
            className="absolute inset-x-0 top-16 mx-auto w-full max-w-2xl rounded-2xl shadow-xl border"
            style={{
              backgroundColor: "var(--bg-card)",
              borderColor: "var(--border-default)",
            }}
          >
            <div
              className="p-4 border-b flex items-center justify-between"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              <div>
                <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                  관리자 지정
                </h2>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  관리자 추가/해제 및 현재 관리자 확인
                </p>
              </div>
              <button
                type="button"
                className="transition-colors inline-flex items-center gap-1"
                style={{ color: "var(--text-secondary)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "var(--text-primary)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "var(--text-secondary)";
                }}
                onClick={() => setAdminModalOpen(false)}
              >
                <X className="w-4 h-4" />
                닫기
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <div className="text-xs font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>
                  현재 관리자
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {admins.map((u) => (
                    <div
                      key={u.emp_no}
                      className="border rounded-lg px-3 py-2 text-sm"
                      style={{
                        borderColor: "var(--color-success-200)",
                        backgroundColor: "var(--color-success-50)",
                        color: "var(--color-success-900)",
                      }}
                    >
                      {u.kor_name ?? "-"} / {u.title ?? "-"}
                    </div>
                  ))}
                  {!admins.length && (
                    <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      관리자가 없습니다.
                    </div>
                  )}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                    사용자 검색
                  </div>
                  <input
                    className="border rounded-lg px-3 py-2 text-sm flex-1 focus:outline-none focus:ring-2 transition-all"
                    style={{
                      borderColor: "var(--border-default)",
                      backgroundColor: "var(--bg-card)",
                      color: "var(--text-primary)",
                    }}
                    placeholder="이름/직급/부서/직책/ID 검색"
                    value={adminSearch}
                    onChange={(e) => setAdminSearch(e.target.value)}
                  />
                </div>
                <div
                  className="max-h-80 overflow-auto border rounded-lg"
                  style={{ borderColor: "var(--border-subtle)" }}
                >
                  {adminCandidates.map((u) => (
                    <div
                      key={u.emp_no}
                      className="flex items-center justify-between px-3 py-2 border-t first:border-t-0 text-sm"
                      style={{ borderColor: "var(--border-subtle)" }}
                    >
                      <div style={{ color: "var(--text-primary)" }}>
                        {u.emp_no} · {u.kor_name ?? "-"} / {u.title ?? "-"} / {u.department ?? "-"}
                      </div>
                      <button
                        type="button"
                        className="px-3 py-1 rounded-md text-xs border transition-all"
                        style={{
                          borderColor:
                            u.role === "admin" ? "var(--color-danger-200)" : "var(--color-success-200)",
                          color: u.role === "admin" ? "var(--color-danger-700)" : "var(--color-success-700)",
                          backgroundColor: u.role === "admin" ? "var(--color-danger-50)" : "var(--color-success-50)",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor =
                            u.role === "admin" ? "var(--color-danger-100)" : "var(--color-success-100)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor =
                            u.role === "admin" ? "var(--color-danger-50)" : "var(--color-success-50)";
                        }}
                        disabled={savingId === u.emp_no}
                        onClick={() =>
                          handleRoleChange(u.emp_no, u.role === "admin" ? "requester" : "admin")
                        }
                      >
                        {u.role === "admin" ? "관리자 해제" : "관리자 지정"}
                      </button>
                    </div>
                  ))}
                  {!adminCandidates.length && (
                    <div className="px-3 py-4 text-sm" style={{ color: "var(--text-secondary)" }}>
                      검색 결과가 없습니다.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
