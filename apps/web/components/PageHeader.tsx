"use client";

import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  meta?: ReactNode;
  actions?: ReactNode;
};

export default function PageHeader({ eyebrow, title, subtitle, meta, actions }: PageHeaderProps) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-sky-50 via-emerald-50 to-indigo-50 px-6 py-5">
        <div>
          {eyebrow && <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">{eyebrow}</div>}
          <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
          {meta && <div className="mt-1 text-sm text-slate-600">{meta}</div>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
