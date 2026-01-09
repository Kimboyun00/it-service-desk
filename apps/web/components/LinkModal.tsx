"use client";

type Props = {
  open: boolean;
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export default function LinkModal({ open, value, onChange, onClose, onSubmit }: Props) {
  if (!open) return null;

  return (
    <div className="absolute right-3 top-full z-20 mt-2 w-72 rounded-md border border-slate-200 bg-white p-3 shadow-lg">
      <div className="text-xs font-medium text-slate-600">링크</div>
      <input
        className="mt-2 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
        placeholder="https://example.com"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          className="rounded-md border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50"
          onClick={onClose}
        >
          취소
        </button>
        <button
          type="button"
          className="rounded-md border border-slate-900 bg-slate-900 px-3 py-1 text-xs text-white hover:bg-slate-800"
          onClick={onSubmit}
        >
          적용
        </button>
      </div>
    </div>
  );
}
