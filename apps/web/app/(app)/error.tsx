"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div
      className="min-h-[60vh] flex flex-col items-center justify-center px-4"
      style={{ color: "var(--text-primary)" }}
    >
      <h1 className="text-xl font-semibold mb-2">일시적인 오류가 발생했습니다</h1>
      <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
        페이지를 불러오는 중 문제가 생겼습니다. 아래에서 다시 시도하거나 홈으로 이동해 주세요.
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ backgroundColor: "var(--color-primary-600)" }}
        >
          다시 시도
        </button>
        <Link
          href="/home"
          className="px-4 py-2 rounded-lg text-sm font-medium border"
          style={{
            borderColor: "var(--border-default)",
            backgroundColor: "var(--bg-card)",
            color: "var(--text-primary)",
          }}
        >
          홈으로
        </Link>
      </div>
    </div>
  );
}
