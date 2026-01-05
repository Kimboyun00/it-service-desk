"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

type Ticket = {
  id: number;
  title: string;
  status: string; // open | in_progress | resolved | closed 등등 (백엔드 값에 맞춰 매핑)
  priority?: string;
  category?: string;
  assignee_id?: number | null;
  created_at?: string;
};

function Card({
  title,
  children,
  right,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={
        "rounded-2xl border border-white/30 bg-white/80 backdrop-blur shadow-sm " +
        className
      }
    >
      <div className="px-5 pt-4 pb-3 flex items-center justify-between">
        <div className="text-sm font-semibold">{title}</div>
        {right}
      </div>
      <div className="px-5 pb-5">{children}</div>
    </div>
  );
}

function StatPill({
  label,
  value,
  accent,
  loading,
}: {
  label: string;
  value: number;
  accent?: boolean;
  loading?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/30 bg-white/85 backdrop-blur shadow-sm px-5 py-4 flex items-center justify-between gap-6">
      <div className={`text-sm font-semibold ${accent ? "text-teal-700" : "text-gray-800"}`}>{label}</div>
      <div className={`text-xl font-bold ${accent ? "text-teal-700" : ""}`}>
        {loading ? "…" : value}
      </div>
    </div>
  );
}

/**
 * ✅ 너희 백엔드 status 값이 뭐냐에 따라 이 매핑만 맞추면 됨.
 * 지금은 안전하게:
 * - open / new / pending => 대기
 * - in_progress / progress / working => 진행
 * - resolved / closed / done => 완료
 */
function classifyStatus(status: string) {
  const s = (status || "").toLowerCase();

  const waiting = new Set(["open", "new", "pending", "todo", "requested"]);
  const doing = new Set(["in_progress", "progress", "working", "assigned", "doing"]);
  const done = new Set(["resolved", "closed", "done", "completed"]);

  if (waiting.has(s)) return "waiting";
  if (doing.has(s)) return "doing";
  if (done.has(s)) return "done";
  // 알 수 없으면 대기로 처리
  return "waiting";
}

function statusBadge(status: string) {
  const cls = classifyStatus(status);
  if (cls === "waiting") return { label: "대기", className: "bg-teal-100 text-teal-800" };
  if (cls === "doing") return { label: "진행", className: "bg-amber-100 text-amber-800" };
  return { label: "완료", className: "bg-emerald-100 text-emerald-800" };
}

export default function HomePage() {
  // ✅ 티켓을 넉넉히 가져와서(예: 200개) 프론트에서 집계
  // 데이터가 많아지면 서버에 /stats 같은 집계 API를 추가하는 게 정석.
  const limit = 100;

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["homeTickets", limit],
    queryFn: async () => {
      // 백엔드에 /tickets GET 있음 (status/priority/category filter 지원)
      return await api<Ticket[]>(`/tickets?limit=${limit}&offset=0`, { method: "GET" });
    },
    staleTime: 10_000,
  });

  const { waitingCount, doingCount, doneCount, recent } = useMemo(() => {
    const tickets = Array.isArray(data) ? data : [];

    let waiting = 0;
    let doing = 0;
    let done = 0;

    for (const t of tickets) {
      const cls = classifyStatus(t.status);
      if (cls === "waiting") waiting++;
      else if (cls === "doing") doing++;
      else done++;
    }

    // 최신순 정렬 (created_at이 없거나 형식 다르면 id로 대체)
    const recentTickets = [...tickets]
      .sort((a, b) => {
        const at = a.created_at ? Date.parse(a.created_at) : 0;
        const bt = b.created_at ? Date.parse(b.created_at) : 0;
        if (bt !== at) return bt - at;
        return (b.id ?? 0) - (a.id ?? 0);
      })
      .slice(0, 5);

    return {
      waitingCount: waiting,
      doingCount: doing,
      doneCount: done,
      recent: recentTickets,
    };
  }, [data]);

  return (
    <div className="relative min-h-[calc(100vh-56px)]">
      {/* 배경 */}
      <div className="absolute inset-0 -z-10">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1920&q=80')",
          }}
        />
        <div className="absolute inset-0 bg-black/15" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-white/10 to-white/40" />
      </div>

      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          {/* 상단 통계 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <StatPill label="대기" value={waitingCount} accent loading={isLoading || isFetching} />
            <StatPill label="진행" value={doingCount} loading={isLoading || isFetching} />
            <StatPill label="완료" value={doneCount} loading={isLoading || isFetching} />
          </div>

          {/* 에러 표시 */}
          {isError && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              티켓을 불러오지 못했습니다.{" "}
              <button className="underline" onClick={() => refetch()}>
                다시 시도
              </button>
              <div className="mt-1 text-xs text-red-700">
                {(error as any)?.message ?? "Unknown error"}
              </div>
            </div>
          )}

          {/* 메인 그리드 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* 공지사항 (더미) */}
            <Card title="공지사항" right={<span className="text-xs text-gray-500">‹ › ⟳ ＋</span>}>
              <ul className="text-sm text-gray-700 space-y-2 leading-6">
                <li>• 크롬 최신 업데이트로 인해 스크롤 이슈가 발생할 수 있습니다.</li>
                <li>• 엣지, 크롬 업데이트 후 eGate-Plus 접속 오류 해결 안내</li>
                <li>• 원격지원은 운영시간(09:00~18:00) 내 지원됩니다.</li>
              </ul>
            </Card>

            {/* 요청현황 (연동) */}
            <Card
              title="요청현황"
              right={
                <button
                  className="text-xs text-gray-600 hover:underline"
                  onClick={() => refetch()}
                  title="새로고침"
                >
                  {isFetching ? "불러오는 중…" : "새로고침"}
                </button>
              }
              className="lg:col-span-2"
            >
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="border-b">
                      <th className="text-left p-2 w-[55%]">제목</th>
                      <th className="text-left p-2 w-[15%]">상태</th>
                      <th className="text-left p-2 w-[15%]">담당</th>
                      <th className="text-left p-2 w-[15%]">ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(recent ?? []).length === 0 ? (
                      <tr>
                        <td className="p-3 text-gray-500" colSpan={4}>
                          최근 요청이 없습니다.
                        </td>
                      </tr>
                    ) : (
                      recent.map((t) => {
                        const b = statusBadge(t.status);
                        return (
                          <tr key={t.id} className="border-b hover:bg-gray-50">
                            <td className="p-2">
                              <Link className="hover:underline" href={`/tickets/${t.id}`}>
                                {t.title}
                              </Link>
                            </td>
                            <td className="p-2">
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${b.className}`}>
                                {b.label}
                              </span>
                            </td>
                            <td className="p-2 text-gray-700">{t.assignee_id ?? "-"}</td>
                            <td className="p-2 text-gray-600">#{t.id}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 text-right">
                <Link href="/tickets" className="text-sm text-blue-700 hover:underline">
                  전체 보기 →
                </Link>
              </div>
            </Card>

            {/* 아래 카드들은 일단 더미 유지 (원하면 다음에 연동) */}
            <Card title="고객정보">
              <div className="text-sm text-gray-700 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-medium">KDISCHOOL 유지보수_2026</div>
                  <span className="text-xs rounded-full bg-blue-100 text-blue-800 px-2 py-0.5">
                    운영지원
                  </span>
                </div>
                <div className="text-xs text-gray-500">계약기간 2026-01-01 ~ 2026-12-31</div>
                <div className="mt-3 rounded-xl border bg-white p-3">
                  <div className="text-xs text-gray-500 mb-2">진행률</div>
                  <div className="h-2 rounded bg-gray-200 overflow-hidden">
                    <div className="h-full w-[38%] bg-teal-500" />
                  </div>
                  <div className="mt-2 text-xs text-gray-600">진행중 18건</div>
                </div>
              </div>
            </Card>

            <div className="lg:col-span-2 rounded-2xl border border-white/30 bg-white/80 backdrop-blur shadow-sm p-5 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">원격지원 바로가기</div>
                <div className="text-sm text-gray-600 mt-1">
                  기업용 원격지원 서비스를 통해 신속한 해결을 지원합니다.
                </div>
              </div>
              <button className="rounded-xl bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700">
                바로가기
              </button>
            </div>

            <Card title="업무담당자">
              <div className="text-sm text-gray-700 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium">조영철 · 이사</div>
                    <div className="text-xs text-gray-500">010-8795-9580</div>
                  </div>
                  <div className="text-xs text-blue-700">hccho@cordial.co.kr</div>
                </div>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium">서영남 · 부장</div>
                    <div className="text-xs text-gray-500">010-3358-1846</div>
                  </div>
                  <div className="text-xs text-blue-700">syn@cordial.co.kr</div>
                </div>
              </div>
            </Card>

            <Card title="FAQ">
              <ul className="text-sm text-gray-700 space-y-2 leading-6">
                <li>• MoimTalkOn 메시지를 이용한 커뮤니케이션 채널 확장</li>
                <li>• eGatePLUS(메일PC지정) 설치 후 실행이 안되는 경우</li>
              </ul>
            </Card>

            <div className="lg:col-span-2 rounded-2xl border border-white/30 bg-white/80 backdrop-blur shadow-sm p-5">
              <div className="text-2xl font-semibold text-sky-800">기업용 스마트 워크플레이스</div>
              <div className="text-sm text-gray-600 mt-2">
                HOME에서 공지/요청/FAQ/통계를 한눈에 확인합니다.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
