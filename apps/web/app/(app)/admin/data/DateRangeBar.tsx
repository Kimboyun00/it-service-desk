"use client";

import { useCallback, useRef } from "react";

export function DateRangeBar({
  value: [start, end],
  onChange,
}: {
  value: [number, number];
  onChange: (v: [number, number]) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<"start" | "end" | null>(null);

  const pctFromClientX = useCallback((clientX: number) => {
    const el = trackRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    return Math.max(0, Math.min(100, pct));
  }, []);

  const onPointerDown = useCallback(
    (which: "start" | "end") => (e: React.PointerEvent) => {
      e.preventDefault();
      dragging.current = which;
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    []
  );
  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (dragging.current === null) return;
      const pct = pctFromClientX(e.clientX);
      if (dragging.current === "start") {
        onChange([Math.min(pct, end), end]);
      } else {
        onChange([start, Math.max(pct, start)]);
      }
    },
    [start, end, onChange, pctFromClientX]
  );
  const onPointerUp = useCallback((e: React.PointerEvent) => {
    dragging.current = null;
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
  }, []);

  return (
    <div className="space-y-2">
      <div className="relative h-8 flex items-center" ref={trackRef}>
        <div
          className="absolute left-0 right-0 h-2 rounded-full"
          style={{ backgroundColor: "var(--bg-subtle)" }}
        />
        <div
          className="absolute h-2 rounded-full pointer-events-none"
          style={{
            left: `${start}%`,
            width: `${end - start}%`,
            backgroundColor: "var(--color-primary-500)",
          }}
        />
        <div
          role="slider"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={start}
          tabIndex={0}
          className="absolute w-5 h-5 rounded-full border-2 cursor-grab active:cursor-grabbing touch-none"
          style={{
            left: `calc(${start}% - 10px)`,
            top: "50%",
            transform: "translateY(-50%)",
            backgroundColor: "var(--bg-card)",
            borderColor: "var(--color-primary-500)",
          }}
          onPointerDown={onPointerDown("start")}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        />
        <div
          role="slider"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={end}
          tabIndex={0}
          className="absolute w-5 h-5 rounded-full border-2 cursor-grab active:cursor-grabbing touch-none"
          style={{
            left: `calc(${end}% - 10px)`,
            top: "50%",
            transform: "translateY(-50%)",
            backgroundColor: "var(--bg-card)",
            borderColor: "var(--color-primary-500)",
          }}
          onPointerDown={onPointerDown("end")}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        />
      </div>
      <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
        손잡이를 드래그해 1년 중 포함할 기간(월·일)을 설정하세요.
      </p>
    </div>
  );
}
