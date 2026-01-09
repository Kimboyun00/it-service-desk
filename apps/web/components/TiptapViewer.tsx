"use client";

import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { TiptapDoc } from "@/lib/tiptap";

type Props = {
  value: TiptapDoc;
};

export default function TiptapViewer({ value }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
      }),
      Image.configure({
        inline: true,
        allowBase64: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: false,
        linkOnPaste: false,
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: value,
    editable: false,
    immediatelyRender: false,
  });

  useEffect(() => {
    if (editor) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  if (!editor) return null;
  return <EditorContent editor={editor} className="tiptap" />;
}
