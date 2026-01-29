type Props = {
  page: number;
  total: number;
  pageSize?: number;
  onChange: (nextPage: number) => void;
};

export default function Pagination({ page, total, pageSize = 10, onChange }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  return (
    <div
      className="flex items-center justify-between pb-4 border-b"
      style={{ borderColor: "var(--border-default)" }}
    >
      <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
        총 <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{total}</span>개 항목
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            borderColor: "var(--border-default)",
            backgroundColor: "var(--bg-card)",
            color: "var(--text-primary)",
          }}
          onMouseEnter={(e) => {
            if (!e.currentTarget.disabled) {
              e.currentTarget.style.backgroundColor = "var(--bg-hover)";
              e.currentTarget.style.borderColor = "var(--border-hover)";
            }
          }}
          onMouseLeave={(e) => {
            if (!e.currentTarget.disabled) {
              e.currentTarget.style.backgroundColor = "var(--bg-card)";
              e.currentTarget.style.borderColor = "var(--border-default)";
            }
          }}
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          aria-label="이전 페이지"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          이전
        </button>
        <div className="px-3 text-sm font-medium" style={{ color: "var(--text-primary)" }}>
          <span style={{ color: "var(--color-primary-600)" }}>{page}</span>
          <span className="mx-1" style={{ color: "var(--text-tertiary)" }}>/</span>
          <span>{totalPages}</span>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            borderColor: "var(--border-default)",
            backgroundColor: "var(--bg-card)",
            color: "var(--text-primary)",
          }}
          onMouseEnter={(e) => {
            if (!e.currentTarget.disabled) {
              e.currentTarget.style.backgroundColor = "var(--bg-hover)";
              e.currentTarget.style.borderColor = "var(--border-hover)";
            }
          }}
          onMouseLeave={(e) => {
            if (!e.currentTarget.disabled) {
              e.currentTarget.style.backgroundColor = "var(--bg-card)";
              e.currentTarget.style.borderColor = "var(--border-default)";
            }
          }}
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          aria-label="다음 페이지"
        >
          다음
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
