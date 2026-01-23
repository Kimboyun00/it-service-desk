/**
 * EmptyState Component
 * 데이터가 없을 때 표시하는 빈 상태 컴포넌트
 */

import { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center animate-fadeIn ${className}`}>
      {icon && (
        <div className="mb-4" style={{ color: "var(--text-tertiary)" }}>
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
        {title}
      </h3>
      {description && (
        <p className="text-sm max-w-sm mb-6" style={{ color: "var(--text-secondary)" }}>
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
