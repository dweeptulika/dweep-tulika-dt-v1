"use client";

import { ChangeEvent, useEffect, useRef } from "react";

type Props = {
  value: string;
  onChange: (html: string) => void;
  onUploadImage?: (file: File) => Promise<string | null>;
};

const tools = [
  { label: "B", title: "Bold", command: "bold" },
  { label: "I", title: "Italic", command: "italic" },
  { label: "U", title: "Underline", command: "underline" },
  { label: "S", title: "Strikethrough", command: "strikeThrough" },
  { label: "H2", title: "Heading 2", command: "formatBlock", value: "h2" },
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

  useEffect(() => {
    const el = editorRef.current;
    if (el && el.innerHTML !== value && document.activeElement !== el) el.innerHTML = value;
  }, [value]);

  function saveSelection() {
    const selection = window.getSelection();
    if (selection?.rangeCount && editorRef.current?.contains(selection.anchorNode)) {
      savedRange.current = selection.getRangeAt(0).cloneRange();
    }
  }

  function restoreSelection() {
    const selection = window.getSelection();
    const editor = editorRef.current;
    if (!selection || !editor) return null;
    editor.focus();
    if (savedRange.current && editor.contains(savedRange.current.commonAncestorContainer)) {
      selection.removeAllRanges();
      selection.addRange(savedRange.current);
      return savedRange.current;
    }
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
    return range;
  }

  function run(command: string, commandValue?: string) {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    restoreSelection();
    document.execCommand(command, false, commandValue);
    saveSelection();
    onChange(el.innerHTML);
  }

  function addLink() {
    const url = window.prompt("Enter the link URL (https://…):");
    if (url && /^https?:\/\//i.test(url.trim())) run("createLink", url.trim());
  }

  async function addInlineImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !onUploadImage) return;

    const url = await onUploadImage(file);
    if (!url) return;

    const editor = editorRef.current;
    if (!editor) return;
    const range = restoreSelection();
    if (!range) return;

    const alt = window.prompt("Enter descriptive alt text for this image:", file.name.replace(/\.[^.]+$/, "")) ?? "";
    const caption = window.prompt("Enter an optional image caption (leave blank for none):", "") ?? "";
    const figure = document.createElement("figure");
    figure.className = "articleInlineFigure";
    const image = document.createElement("img");
    image.src = url;
    image.alt = alt.trim();
    image.loading = "lazy";
    figure.appendChild(image);
    if (caption.trim()) {
      const figcaption = document.createElement("figcaption");
      figcaption.textContent = caption.trim();
      figure.appendChild(figcaption);
    }

    range.deleteContents();
    range.insertNode(figure);
    const paragraph = document.createElement("p");
    paragraph.appendChild(document.createElement("br"));
    figure.parentNode?.insertBefore(paragraph, figure.nextSibling);
    const selection = window.getSelection();
    const nextRange = document.createRange();
    nextRange.selectNodeContents(paragraph);
    nextRange.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(nextRange);
    savedRange.current = nextRange.cloneRange();
    onChange(editor.innerHTML);
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
        <button type="button" title="Insert link"
          onMouseDown={(event) => { event.preventDefault(); saveSelection(); }}
          onClick={addLink}>Link</button>
        {onUploadImage && <>
          <button type="button" title="Insert image into article"
            onMouseDown={(event) => { event.preventDefault(); saveSelection(); }}
            onClick={() => imageInputRef.current?.click()}>Image</button>
          <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp"
            onChange={(event) => void addInlineImage(event)} hidden />
        </>}
        <button type="button" title="Undo" onMouseDown={(event) => event.preventDefault()} onClick={() => run("undo")}>↶</button>
        <button type="button" title="Redo" onMouseDown={(event) => event.preventDefault()} onClick={() => run("redo")}>↷</button>
      </div>
      <div ref={editorRef} className="richEditorSurface" contentEditable suppressContentEditableWarning
        role="textbox" aria-label="Article body" aria-multiline="true"
        onInput={(event) => onChange(event.currentTarget.innerHTML)}
        onKeyUp={saveSelection} onMouseUp={saveSelection} onBlur={saveSelection}
        data-placeholder="Write your article here. Select text and use the toolbar to format it." />
      <p className="richEditorHint">Formatting applies to the selected text or current paragraph. Press Enter to start a new paragraph.</p>
    </div>
  );
}
