"use client";

import { ChangeEvent, useEffect, useRef } from "react";

type Props = {
  value: string;
  onChange: (html: string) => void;
  onUploadImage: (file: File) => Promise<{ url: string; alt: string } | null>;
};

const tools = [
  { label: "B", title: "Bold", command: "bold" },
  { label: "I", title: "Italic", command: "italic" },
  { label: "U", title: "Underline", command: "underline" },
  { label: "S", title: "Strikethrough", command: "strikeThrough" },
  { label: "H2", title: "Heading 2", command: "formatBlock", value: "h2" },
  { label: "H3", title: "Heading 3", command: "formatBlock", value: "h3" },
  { label: "¶", title: "Paragraph", command: "formatBlock", value: "p" },
  { label: "❝", title: "Block quote", command: "formatBlock", value: "blockquote" },
  { label: "• List", title: "Bulleted list", command: "insertUnorderedList" },
  { label: "1. List", title: "Numbered list", command: "insertOrderedList" },
  { label: "←", title: "Align left", command: "justifyLeft" },
  { label: "↔", title: "Center", command: "justifyCenter" },
  { label: "→", title: "Align right", command: "justifyRight" },
  { label: "☷", title: "Justify paragraph", command: "justifyFull" },
];

export function RichTextEditor({ value, onChange, onUploadImage }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const savedRange = useRef<Range | null>(null);
  const uploadingImage = useRef(false);

  useEffect(() => {
    const el = editorRef.current;
    // Reconcile external loads (switching articles) without overwriting live typing.
    if (el && document.activeElement !== el && el.innerHTML !== value) el.innerHTML = value || "";
  }, [value]);

  function saveSelection() {
    const el = editorRef.current;
    const selection = window.getSelection();
    if (el && selection?.rangeCount) {
      const range = selection.getRangeAt(0);
      if (el.contains(range.startContainer) && el.contains(range.endContainer)) {
        savedRange.current = range.cloneRange();
      }
    }
  }

  function restoreSelection() {
    const el = editorRef.current;
    const selection = window.getSelection();
    if (!el || !selection) return false;
    el.focus();
    if (savedRange.current && el.contains(savedRange.current.startContainer) && el.contains(savedRange.current.endContainer)) {
      selection.removeAllRanges();
      selection.addRange(savedRange.current);
      return true;
    }
    return false;
  }

  function run(command: string, commandValue?: string) {
    const el = editorRef.current;
    if (!el) return;
    restoreSelection();
    document.execCommand(command, false, commandValue);
    saveSelection();
    onChange(el.innerHTML);
  }

  function addLink() {
    const url = window.prompt("Enter the link URL (https://…):");
    if (url && /^https?:\/\//i.test(url.trim())) run("createLink", url.trim());
  }

  async function insertImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || uploadingImage.current) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      window.alert("Choose a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      window.alert("Inline images must be 10 MB or smaller.");
      return;
    }
    uploadingImage.current = true;
    try {
      const uploaded = await onUploadImage(file);
      const el = editorRef.current;
      if (!uploaded || !el) return;
      restoreSelection();
      const safeUrl = uploaded.url.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
      const safeAlt = uploaded.alt.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      document.execCommand("insertHTML", false, `<figure><img src="${safeUrl}" alt="${safeAlt}" loading="lazy"><figcaption>${safeAlt}</figcaption></figure><p><br></p>`);
      saveSelection();
      onChange(el.innerHTML);
    } finally {
      uploadingImage.current = false;
    }
  }

  return (
    <div className="richEditor">
      <div className="richToolbar" role="toolbar" aria-label="Article formatting">
        {tools.map((tool) => (
          <button key={tool.title} type="button" title={tool.title}
            onMouseDown={(event) => { event.preventDefault(); saveSelection(); }}
            onClick={() => run(tool.command, tool.value)}
          >{tool.label}</button>
        ))}
        <button type="button" title="Insert link" onMouseDown={(event) => { event.preventDefault(); saveSelection(); }} onClick={addLink}>Link</button>
        <button type="button" title="Insert image at cursor" onMouseDown={(event) => { event.preventDefault(); saveSelection(); }} onClick={() => imageInputRef.current?.click()}>Insert image</button>
        <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => void insertImage(event)} aria-label="Choose inline image" />
        <button type="button" title="Undo" onMouseDown={(event) => event.preventDefault()} onClick={() => run("undo")}>↶</button>
        <button type="button" title="Redo" onMouseDown={(event) => event.preventDefault()} onClick={() => run("redo")}>↷</button>
      </div>
      <div ref={editorRef} className="richEditorSurface" contentEditable suppressContentEditableWarning
        role="textbox" aria-label="Article body" aria-multiline="true"
        onInput={(event) => onChange(event.currentTarget.innerHTML)}
        onKeyUp={saveSelection} onMouseUp={saveSelection} onBlur={saveSelection}
        data-placeholder="Write your article here. Place the cursor where you want to insert an image." />
      <p className="richEditorHint">Select text to format it. Place the cursor inside the article before inserting an image. Images are uploaded to the newsroom media library.</p>
    </div>
  );
}
