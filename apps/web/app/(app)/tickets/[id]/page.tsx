"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type Attachment = {
  id: number;
  key: string;
  filename: string;
  content_type: string;
  size: number;
  ticket_id: number | null;
  comment_id: number | null;
  is_internal: boolean;
  uploaded_by: number;
  created_at?: string | null;
};

type Comment = {
  id: number;
  ticket_id: number;
  author_id: number;
  body: string;
  is_internal: boolean;
};

type Event = {
  id: number;
  ticket_id: number;
  actor_id: number;
  type: string;
  from_value: string | null;
  to_value: string | null;
  note: string | null;
};

type Ticket = {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  requester_id: number;
  assignee_id: number | null;
  created_at: string;
};

type TicketDetail = {
  ticket: Ticket;
  comments: Comment[];
  events: Event[];
  attachments: Attachment[];
};

function FieldRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="grid grid-cols-12 border-b">
      <div className="col-span-3 bg-gray-50 text-sm text-gray-600 px-3 py-2 border-r">
        {label}
      </div>
      <div className="col-span-9 text-sm px-3 py-2">{value ?? "-"}</div>
    </div>
  );
}

export default function TicketDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const ticketId = Number(params.id);

  const [tab, setTab] = useState<"customer" | "agent">("customer");

  const { data, isLoading } = useQuery({
    queryKey: ["ticketDetail", ticketId],
    queryFn: () => api<TicketDetail>(`/tickets/${ticketId}/detail`),
  });

  const downloadAttachmentM = useMutation({
    mutationFn: async (attachmentId: number) => {
      const { url } = await api<{ url: string }>(`/attachments/${attachmentId}/download-url`);
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
      const token = getToken();

      const res = await fetch(`${apiBase}${url}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Download failed ${res.status}: ${text}`);
      }

      const cd = res.headers.get("content-disposition") ?? "";
      const m = /filename="([^"]+)"/.exec(cd);
      const filename = m?.[1] ?? `attachment-${attachmentId}`;

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
      return true;
    },
  });

  const customerAttachments = useMemo(
    () => (data?.attachments ?? []).filter((a) => !a.is_internal),
    [data]
  );
  const internalAttachments = useMemo(
    () => (data?.attachments ?? []).filter((a) => a.is_internal),
    [data]
  );

  const customerComments = useMemo(
    () => (data?.comments ?? []).filter((c) => !c.is_internal),
    [data]
  );
  const internalComments = useMemo(
    () => (data?.comments ?? []).filter((c) => c.is_internal),
    [data]
  );

  if (isLoading || !data) return <div className="p-6">Loading...</div>;

  const t = data.ticket;

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs text-gray-500">Ticket #{t.id}</div>
          <h1 className="text-xl font-semibold">{t.title}</h1>
          <div className="text-sm text-gray-600 mt-1">
            상태: <span className="font-medium">{t.status}</span>
            <span className="mx-2">•</span>
            우선순위: <span className="font-medium">{t.priority}</span>
          </div>
        </div>
        <button className="border rounded px-3 py-2 text-sm" onClick={() => router.push("/tickets")}>
          목록으로
        </button>
      </div>

      {/* Meta grid (스샷처럼 표 느낌) */}
      <div className="border rounded">
        <FieldRow label="요청자 ID" value={t.requester_id} />
        <FieldRow label="담당자 ID" value={t.assignee_id ?? "-"} />
        <FieldRow label="카테고리" value={t.category} />
        <FieldRow label="생성일" value={new Date(t.created_at).toLocaleString()} />
      </div>

      {/* Tabs */}
      <div className="border rounded">
        <div className="flex border-b">
          <button
            className={`px-4 py-2 text-sm ${
              tab === "customer" ? "bg-white font-medium" : "bg-gray-50 text-gray-600"
            }`}
            onClick={() => setTab("customer")}
          >
            고객요청
          </button>
          <button
            className={`px-4 py-2 text-sm border-l ${
              tab === "agent" ? "bg-white font-medium" : "bg-gray-50 text-gray-600"
            }`}
            onClick={() => setTab("agent")}
          >
            담당처리
          </button>
        </div>

        {/* Tab content */}
        <div className="p-4 space-y-4">
          {tab === "customer" ? (
            <>
              <section className="space-y-2">
                <div className="text-sm font-semibold">요청 내용</div>
                <div className="border rounded p-3 text-sm whitespace-pre-wrap">{t.description}</div>
              </section>

              <section className="space-y-2">
                <div className="text-sm font-semibold">첨부파일</div>
                {customerAttachments.length === 0 ? (
                  <div className="text-sm text-gray-500">첨부파일이 없습니다.</div>
                ) : (
                  <div className="border rounded divide-y">
                    {customerAttachments.map((a) => (
                      <div key={a.id} className="flex items-center justify-between px-3 py-2">
                        <div className="text-sm">{a.filename}</div>
                        <button
                          className="text-sm border rounded px-2 py-1"
                          onClick={() => downloadAttachmentM.mutate(a.id)}
                        >
                          다운로드
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="space-y-2">
                <div className="text-sm font-semibold">외부 댓글</div>
                {customerComments.length === 0 ? (
                  <div className="text-sm text-gray-500">댓글이 없습니다.</div>
                ) : (
                  <div className="border rounded divide-y">
                    {customerComments.map((c) => (
                      <div key={c.id} className="px-3 py-2 text-sm whitespace-pre-wrap">
                        {c.body}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          ) : (
            <>
              <section className="space-y-2">
                <div className="text-sm font-semibold">내부 메모</div>
                {internalComments.length === 0 ? (
                  <div className="text-sm text-gray-500">내부 메모가 없습니다.</div>
                ) : (
                  <div className="border rounded divide-y">
                    {internalComments.map((c) => (
                      <div key={c.id} className="px-3 py-2 text-sm whitespace-pre-wrap">
                        {c.body}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="space-y-2">
                <div className="text-sm font-semibold">내부 첨부파일</div>
                {internalAttachments.length === 0 ? (
                  <div className="text-sm text-gray-500">내부 첨부파일이 없습니다.</div>
                ) : (
                  <div className="border rounded divide-y">
                    {internalAttachments.map((a) => (
                      <div key={a.id} className="flex items-center justify-between px-3 py-2">
                        <div className="text-sm">{a.filename}</div>
                        <button
                          className="text-sm border rounded px-2 py-1"
                          onClick={() => downloadAttachmentM.mutate(a.id)}
                        >
                          다운로드
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* 여기에 상태 변경 / 담당자 지정 / 내부 업로드 UI를 추가하면 스샷과 거의 동일 */}
              <section className="text-sm text-gray-500">
                (다음 단계) 상태 변경/담당자 지정/내부 업로드 위젯을 이 탭에 넣으면 스샷 구성 완성.
              </section>
            </>
          )}
        </div>
      </div>

      {/* Event Log */}
      <div className="border rounded">
        <div className="px-4 py-2 border-b text-sm font-semibold">작업처리내역</div>
        {data.events.length === 0 ? (
          <div className="p-4 text-sm text-gray-500">이벤트가 없습니다.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="border-b">
                <th className="text-left p-2 w-16">No</th>
                <th className="text-left p-2 w-44">일시</th>
                <th className="text-left p-2 w-28">유형</th>
                <th className="text-left p-2">처리내역</th>
              </tr>
            </thead>
            <tbody>
              {data.events.map((e, idx) => (
                <tr key={e.id} className="border-b">
                  <td className="p-2">{idx + 1}</td>
                  <td className="p-2 text-gray-600">
                    {/* created_at이 없으면 note나 id 기반으로 표시하거나, 이벤트 모델에 created_at 추가 권장 */}
                    -
                  </td>
                  <td className="p-2">{e.type}</td>
                  <td className="p-2 text-gray-700">{e.note ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
