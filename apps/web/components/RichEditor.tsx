"use client";

import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  readOnly?: boolean;
};

export default function RichEditor({ value, onChange, placeholder, readOnly = false }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
    ],
    content: value,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    immediatelyRender: false, // SSR 하이드레이션 불일치 방지
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className="border rounded p-2 bg-white">
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-2 mb-2 text-sm">
          <button
            type="button"
            className="px-2 py-1 border rounded bg-white text-black hover:bg-gray-100"
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            Bold
          </button>
          <button
            type="button"
            className="px-2 py-1 border rounded bg-white text-black hover:bg-gray-100"
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            Italic
          </button>
          <button
            type="button"
            className="px-2 py-1 border rounded bg-white text-black hover:bg-gray-100"
            onClick={() => editor.chain().focus().toggleUnderline?.().run() || editor.chain().focus().setMark("underline").run()}
          >
            Underline
          </button>
          <button
            type="button"
            className="px-2 py-1 border rounded bg-white text-black hover:bg-gray-100"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            • 목록
          </button>
          <button
            type="button"
            className="px-2 py-1 border rounded bg-white text-black hover:bg-gray-100"
            onClick={() => {
              const url = window.prompt("이미지 URL을 입력하세요");
              if (url) editor.chain().focus().setImage({ src: url }).run();
            }}
          >
            이미지 URL
          </button>
        </div>
      )}
      <div className="min-h-[180px]">
        <EditorContent editor={editor} className="tiptap" />
        {placeholder && !value && <div className="text-sm text-gray-400">{placeholder}</div>}
      </div>
    </div>
  );
}
