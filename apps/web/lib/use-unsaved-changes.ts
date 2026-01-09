"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const DEFAULT_MESSAGE = "이 페이지를 떠나시겠습니까?\n변경사항이 저장되지 않을 수 있습니다.";

export function useUnsavedChangesWarning(enabled: boolean, message: string = DEFAULT_MESSAGE) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastUrlRef = useRef<string>("/");

  useEffect(() => {
    const query = searchParams?.toString();
    lastUrlRef.current = `${pathname}${query ? `?${query}` : ""}`;
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!enabled) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = message;
      return message;
    };

    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const anchor = target.closest("a");
      if (!anchor) return;
      if (anchor.getAttribute("target") === "_blank") return;
      if (anchor.hasAttribute("download")) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;

      let nextUrl: URL;
      try {
        nextUrl = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (nextUrl.origin !== window.location.origin) return;

      const currentUrl = lastUrlRef.current || window.location.pathname + window.location.search;
      const nextPath = `${nextUrl.pathname}${nextUrl.search}`;
      if (nextPath === currentUrl) return;

      const ok = window.confirm(message);
      if (!ok) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    const handlePopState = () => {
      const ok = window.confirm(message);
      if (!ok) {
        history.pushState(null, "", lastUrlRef.current);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleClick, true);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [enabled, message]);
}
