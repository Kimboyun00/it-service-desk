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
    <div className="flex items-center justify-center gap-2 pt-3">
      <button
        type="button"
        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page <= 1}
      >
        이전
      </button>
      <div className="text-sm text-slate-600">
        {page}/{totalPages}
      </div>
      <button
        type="button"
        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
      >
        다음
      </button>
    </div>
  );
}
