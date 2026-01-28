"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useMe } from "@/lib/auth-context";
import PageHeader from "@/components/PageHeader";
import { Folder, ChevronDown, ChevronRight, Pencil } from "lucide-react";

type Project = {
  id: number;
  name: string;
  start_date?: string | null;
  end_date?: string | null;
  created_by_emp_no: string;
  created_at: string;
  sort_order: number;
};

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function isPastProject(p: Project): boolean {
  if (!p.end_date) return false;
  return new Date(p.end_date) < startOfToday();
}

export default function AdminProjectPage() {
  const me = useMe();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [localProjects, setLocalProjects] = useState<Project[]>([]);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; start_date: string; end_date: string } | null>(null);
  const [pastOpen, setPastOpen] = useState(false);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects-admin"],
    queryFn: () => api<Project[]>("/projects?mine=false"),
  });

  const activeProjects = useMemo(
    () => projects.filter((p) => !isPastProject(p)),
    [projects]
  );
  const pastProjects = useMemo(
    () => projects.filter((p) => isPastProject(p)),
    [projects]
  );

  useEffect(() => {
    setLocalProjects(activeProjects);
  }, [activeProjects]);

  const reorderProjectsM = useMutation({
    mutationFn: (orderedIds: number[]) =>
      api("/projects/reorder", {
        method: "POST",
        body: { project_ids: orderedIds },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects-admin"] });
    },
  });

  function handleDragStart(id: number) {
    setDraggingId(id);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>, overId: number) {
    e.preventDefault();
    if (draggingId === null || draggingId === overId) return;
    setLocalProjects((prev) => {
      const currentIndex = prev.findIndex((p) => p.id === draggingId);
      const overIndex = prev.findIndex((p) => p.id === overId);
      if (currentIndex === -1 || overIndex === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(currentIndex, 1);
      next.splice(overIndex, 0, moved);
      return next;
    });
  }

  function handleDrop() {
    if (draggingId === null) return;
    setDraggingId(null);
    if (localProjects.length === 0) return;
    reorderProjectsM.mutate(localProjects.map((p) => p.id));
  }

  const createProjectM = useMutation({
    mutationFn: () =>
      api<Project>("/projects", {
        method: "POST",
        body: {
          name: name.trim(),
          start_date: startDate || null,
          end_date: endDate || null,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects-admin"] });
      setError(null);
      setName("");
      setStartDate("");
      setEndDate("");
    },
    onError: (err: any) => {
      setError(err?.message ?? "프로젝트 생성에 실패했습니다.");
    },
  });

  const updateProjectM = useMutation({
    mutationFn: ({
      id,
      name,
      start_date,
      end_date,
    }: {
      id: number;
      name: string;
      start_date: string;
      end_date: string;
    }) =>
      api<Project>(`/projects/${id}`, {
        method: "PATCH",
        body: {
          name: name.trim() || undefined,
          start_date: start_date || null,
          end_date: end_date || null,
        },
      }),
    onSuccess: () => {
      setEditingId(null);
      setEditForm(null);
      qc.invalidateQueries({ queryKey: ["projects-admin"] });
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : "프로젝트 수정에 실패했습니다.");
    },
  });

  const deleteProjectM = useMutation({
    mutationFn: (projectId: number) =>
      api(`/projects/${projectId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      setEditingId(null);
      setEditForm(null);
      qc.invalidateQueries({ queryKey: ["projects-admin"] });
    },
  });

  function openEdit(p: Project) {
    setEditingId(p.id);
    setEditForm({
      name: p.name,
      start_date: p.start_date ?? "",
      end_date: p.end_date ?? "",
    });
    setError(null);
  }

  function saveEdit() {
    if (!editingId || !editForm) return;
    if (!editForm.name.trim()) {
      setError("프로젝트명을 입력하세요.");
      return;
    }
    updateProjectM.mutate({
      id: editingId,
      name: editForm.name,
      start_date: editForm.start_date,
      end_date: editForm.end_date,
    });
  }

  if (me.role !== "admin") {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          관리자만 접근할 수 있습니다.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <PageHeader
        title="프로젝트 관리"
        subtitle="프로젝트 이름과 기간을 입력해 생성할 수 있습니다."
        icon={<Folder className="w-7 h-7" />}
      />

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="text-sm font-semibold text-slate-900">프로젝트 생성</div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-3">
            <label className="text-xs text-slate-600">프로젝트명</label>
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 2026 IT 서비스 개선"
            />
          </div>
          <div>
            <label className="text-xs text-slate-600">시작일</label>
            <input
              type="date"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-slate-600">종료일</label>
            <input
              type="date"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              className="w-full rounded-lg border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
              onClick={() => {
                setError(null);
                if (!name.trim()) {
                  setError("프로젝트명을 입력하세요.");
                  return;
                }
                createProjectM.mutate();
              }}
              disabled={createProjectM.isPending}
            >
              {createProjectM.isPending ? "생성 중..." : "프로젝트 생성"}
            </button>
          </div>
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900">
          프로젝트 목록
        </div>
        {isLoading && <div className="p-4 text-sm text-slate-500">불러오는 중...</div>}
        {!isLoading && localProjects.length === 0 && pastProjects.length === 0 && (
          <div className="p-4 text-sm text-slate-500">등록된 프로젝트가 없습니다.</div>
        )}
        {!isLoading && localProjects.length > 0 && (
          <div className="divide-y divide-slate-200">
            {localProjects.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 cursor-move"
                draggable
                onDragStart={() => handleDragStart(p.id)}
                onDragOver={(e) => handleDragOver(e, p.id)}
                onDrop={handleDrop}
              >
                {editingId === p.id && editForm ? (
                  <div className="flex flex-wrap items-end gap-3 flex-1 min-w-0">
                    <div className="flex-1 min-w-[120px]">
                      <label className="text-xs text-slate-600">프로젝트명</label>
                      <input
                        className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1.5 text-sm"
                        value={editForm.name}
                        onChange={(e) => setEditForm((f) => (f ? { ...f, name: e.target.value } : f))}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-600">시작일</label>
                      <input
                        type="date"
                        className="mt-0.5 rounded border border-slate-200 px-2 py-1.5 text-sm"
                        value={editForm.start_date}
                        onChange={(e) => setEditForm((f) => (f ? { ...f, start_date: e.target.value } : f))}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-600">종료일</label>
                      <input
                        type="date"
                        className="mt-0.5 rounded border border-slate-200 px-2 py-1.5 text-sm"
                        value={editForm.end_date}
                        onChange={(e) => setEditForm((f) => (f ? { ...f, end_date: e.target.value } : f))}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="rounded-lg border border-slate-900 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
                        onClick={saveEdit}
                        disabled={updateProjectM.isPending}
                      >
                        저장
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700"
                        onClick={() => {
                          setEditingId(null);
                          setEditForm(null);
                          setError(null);
                        }}
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{p.name}</div>
                      <div className="text-xs text-slate-500">
                        {p.start_date ?? "-"} ~ {p.end_date ?? "-"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 inline-flex items-center gap-1"
                        onClick={() => openEdit(p)}
                        disabled={!!editingId}
                      >
                        <Pencil className="w-3 h-3" />
                        수정
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600"
                        onClick={() => {
                          if (!confirm("해당 프로젝트를 삭제하시겠습니까?")) return;
                          deleteProjectM.mutate(p.id);
                        }}
                        disabled={deleteProjectM.isPending}
                      >
                        삭제
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {!isLoading && pastProjects.length > 0 && (
          <div className="border-t border-slate-200">
            <button
              type="button"
              className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              onClick={() => setPastOpen((o) => !o)}
            >
              <span>지난 프로젝트</span>
              {pastOpen ? (
                <ChevronDown className="w-4 h-4 shrink-0 text-slate-500" />
              ) : (
                <ChevronRight className="w-4 h-4 shrink-0 text-slate-500" />
              )}
            </button>
            {pastOpen && (
              <div className="divide-y divide-slate-200 border-t border-slate-100">
                {pastProjects.map((p) => (
                  <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-50/50">
                    {editingId === p.id && editForm ? (
                      <div className="flex flex-wrap items-end gap-3 flex-1 min-w-0">
                        <div className="flex-1 min-w-[120px]">
                          <label className="text-xs text-slate-600">프로젝트명</label>
                          <input
                            className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1.5 text-sm"
                            value={editForm.name}
                            onChange={(e) => setEditForm((f) => (f ? { ...f, name: e.target.value } : f))}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-600">시작일</label>
                          <input
                            type="date"
                            className="mt-0.5 rounded border border-slate-200 px-2 py-1.5 text-sm"
                            value={editForm.start_date}
                            onChange={(e) => setEditForm((f) => (f ? { ...f, start_date: e.target.value } : f))}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-600">종료일</label>
                          <input
                            type="date"
                            className="mt-0.5 rounded border border-slate-200 px-2 py-1.5 text-sm"
                            value={editForm.end_date}
                            onChange={(e) => setEditForm((f) => (f ? { ...f, end_date: e.target.value } : f))}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="rounded-lg border border-slate-900 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
                            onClick={saveEdit}
                            disabled={updateProjectM.isPending}
                          >
                            저장
                          </button>
                          <button
                            type="button"
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700"
                            onClick={() => {
                              setEditingId(null);
                              setEditForm(null);
                              setError(null);
                            }}
                          >
                            취소
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{p.name}</div>
                          <div className="text-xs text-slate-500">
                            {p.start_date ?? "-"} ~ {p.end_date ?? "-"}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 inline-flex items-center gap-1"
                            onClick={() => openEdit(p)}
                            disabled={!!editingId}
                          >
                            <Pencil className="w-3 h-3" />
                            수정
                          </button>
                          <button
                            type="button"
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600"
                            onClick={() => {
                              if (!confirm("해당 프로젝트를 삭제하시겠습니까?")) return;
                              deleteProjectM.mutate(p.id);
                            }}
                            disabled={deleteProjectM.isPending}
                          >
                            삭제
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
