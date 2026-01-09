"use client";

export type TiptapDoc = Record<string, any>;

export const EMPTY_DOC: TiptapDoc = { type: "doc", content: [] };

export function extractText(doc: TiptapDoc | null | undefined): string {
  if (!doc || typeof doc !== "object") return "";
  const parts: string[] = [];
  const walk = (node: any) => {
    if (!node) return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (node.type === "text" && typeof node.text === "string") {
      parts.push(node.text);
      return;
    }
    if (node.content) {
      walk(node.content);
    }
  };
  walk(doc.content);
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

export function isEmptyDoc(doc: TiptapDoc | null | undefined): boolean {
  return extractText(doc).length === 0;
}
