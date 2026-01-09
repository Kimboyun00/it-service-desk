type Props = {
  message: string | null;
  onClose: () => void;
};

export default function ErrorDialog({ message, onClose }: Props) {
  if (!message) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
        <div className="text-base font-semibold text-slate-900">오류</div>
        <div className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">{message}</div>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
