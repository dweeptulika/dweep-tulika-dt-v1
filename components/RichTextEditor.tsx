"use client";

import { useEffect, useRef } from "react";

type Props = { value: string; onChange: (html: string) => void };

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

export function RichTextEditor({ value, onChange }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
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

  function run(command: string, commandValue?: string) {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    const selection = window.getSelection();
    if (savedRange.current && selection) {
      selection.removeAllRanges();
      selection.addRange(savedRange.current);
    }
    document.execCommand(command, false, commandValue);
    saveSelection();
    onChange(el.innerHTML);
  }

  function addLink() {
    const url = window.prompt("Enter the link URL (https://…):");
    if (url && /^https?:\/\//i.test(url.trim())) run("createLink", url.trim());
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
