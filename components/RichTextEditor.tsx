"use client";

import { ChangeEvent, MouseEvent, useEffect, useRef } from "react";

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
  const selectedImageRef = useRef<HTMLImageElement | null>(null);
  const uploadingImage = useRef(false);

  useEffect(() => {
    const el = editorRef.current;
    // Reconcile external loads (switching articles) without overwriting live typing.
    if (el && document.activeElement !== el && el.innerHTML !== value) {
      el.innerHTML = value || "";
      selectedImageRef.current = null;
      savedRange.current = null;
    }
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

  function rememberClickedImage(event: MouseEvent<HTMLDivElement>) {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const image = target.closest("img");
    if (image && editorRef.current?.contains(image)) {
      editorRef.current.querySelectorAll("img.dt-image-selected").forEach((node) => node.classList.remove("dt-image-selected"));
      image.classList.add("dt-image-selected");
      selectedImageRef.current = image as HTMLImageElement;
    }
  }

  function preventImageCaretJump(event: MouseEvent<HTMLDivElement>) {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const image = target.closest("img");
    const editor = editorRef.current;
    if (!image || !editor?.contains(image)) return;

    // Handle selection on mousedown, before contentEditable's native caret placement.
    // preventDefault can suppress the later click event, so selection must happen here.
    event.preventDefault();
    editor.querySelectorAll("img.dt-image-selected").forEach((node) => node.classList.remove("dt-image-selected"));
    image.classList.add("dt-image-selected");
    selectedImageRef.current = image as HTMLImageElement;
  }

  function alignSelectedImage(alignment: "left" | "center" | "right" | "full") {
    const image = selectedImageRef.current;
    const editor = editorRef.current;
    if (!image || !editor?.contains(image)) {
      window.alert("Click the image you want to align first.");
      return;
    }
    let figure = image.closest("figure");
    if (!figure) {
      figure = document.createElement("figure");
      image.replaceWith(figure);
      figure.appendChild(image);
    }
    figure.classList.remove("dt-image-align-left", "dt-image-align-center", "dt-image-align-right", "dt-image-align-full", "dt-image-wrap-left", "dt-image-wrap-right");
    figure.classList.add(`dt-image-align-${alignment}`);
    image.classList.add("dt-image-selected");
    onChange(editor.innerHTML);
  }

  function editImageDetails() {
    const image = selectedImageRef.current;
    if (!image || !editorRef.current?.contains(image)) {
      window.alert("Click the image you want to edit first.");
      return;
    }
    let figure = image.closest("figure");
    if (!figure) {
      figure = document.createElement("figure");
      image.replaceWith(figure);
      figure.appendChild(image);
    }
    const currentCaption = figure.querySelector("figcaption");
    const nextAlt = window.prompt("Describe this image for accessibility (alternative text):", image.alt || "");
    if (nextAlt === null) return;
    const nextCaption = window.prompt("Image caption (leave blank for no caption):", currentCaption?.textContent || "");
    if (nextCaption === null) return;
    image.alt = nextAlt.trim();
    if (nextCaption.trim()) {
      const caption = currentCaption || document.createElement("figcaption");
      caption.textContent = nextCaption.trim();
      if (!currentCaption) figure.appendChild(caption);
    } else {
      currentCaption?.remove();
    }
    onChange(editorRef.current.innerHTML);
  }

  function removeSelectedImage() {
    const image = selectedImageRef.current;
    if (!image || !editorRef.current?.contains(image)) {
      window.alert("Click the image you want to remove first.");
      return;
    }
    const figure = image.closest("figure");
    if (figure) figure.remove();
    else image.remove();
    selectedImageRef.current = null;
    onChange(editorRef.current.innerHTML);
  }

  function moveSelectedImageToCursor() {
    const image = selectedImageRef.current;
    const editor = editorRef.current;
    const range = savedRange.current;
    if (!image || !editor?.contains(image)) {
      window.alert("Click the image you want to move first.");
      return;
    }
    if (!range || !editor.contains(range.startContainer) || !editor.contains(range.endContainer)) {
      window.alert("Click in the article where you want the image to move, then choose this option.");
      return;
    }
    const figure = image.closest("figure");
    const imageHtml = figure ? figure.outerHTML : image.outerHTML;
    if (range.startContainer === figure || (figure && figure.contains(range.startContainer))) {
      window.alert("Choose a different position outside the selected image.");
      return;
    }
    if (figure) figure.remove();
    else image.remove();
    restoreSelection();
    document.execCommand("insertHTML", false, imageHtml + "<p><br></p>");
    selectedImageRef.current = null;
    saveSelection();
    onChange(editor.innerHTML);
  }

  function wrapSelectedImage(side: "left" | "right") {
    const image = selectedImageRef.current;
    const editor = editorRef.current;
    if (!image || !editor?.contains(image)) {
      window.alert("Click the image you want to wrap text around first.");
      return;
    }
    let figure = image.closest("figure");
    if (!figure) {
      figure = document.createElement("figure");
      image.replaceWith(figure);
      figure.appendChild(image);
    }
    figure.classList.remove("dt-image-align-left", "dt-image-align-center", "dt-image-align-right", "dt-image-align-full", "dt-image-wrap-left", "dt-image-wrap-right");
    figure.classList.add(`dt-image-wrap-${side}`);
    image.classList.add("dt-image-selected");
    onChange(editor.innerHTML);
  }

  function insertTable() {
    const editor = editorRef.current;
    const range = savedRange.current;
    if (!editor || !range || !editor.contains(range.startContainer) || !editor.contains(range.endContainer)) {
      window.alert("Click inside the article where you want the table, then choose Insert table.");
      return;
    }

    const rowInput = window.prompt("How many rows? (1–20)", "3");
    if (rowInput === null) return;
    const rows = Number(rowInput);
    if (!Number.isInteger(rows) || rows < 1 || rows > 20) {
      window.alert("Enter a whole number of rows between 1 and 20.");
      return;
    }

    const columnInput = window.prompt("How many columns? (1–10)", "3");
    if (columnInput === null) return;
    const columns = Number(columnInput);
    if (!Number.isInteger(columns) || columns < 1 || columns > 10) {
      window.alert("Enter a whole number of columns between 1 and 10.");
      return;
    }

    if (!restoreSelection()) {
      window.alert("Click inside the article again to set the table position, then retry.");
      return;
    }
    const cellHtml = "<p><br></p>";
    const rowsHtml = Array.from({ length: rows }, (_, rowIndex) => {
      const cellTag = rowIndex === 0 ? "th" : "td";
      const cells = Array.from({ length: columns }, () => `<${cellTag}>${cellHtml}</${cellTag}>`).join("");
      return `<tr>${cells}</tr>`;
    }).join("");
    document.execCommand("insertHTML", false, `<table><tbody>${rowsHtml}</tbody></table><p><br></p>`);
    saveSelection();
    onChange(editor.innerHTML);
  }

  async function insertImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || uploadingImage.current) return;
    const editor = editorRef.current;
    const range = savedRange.current;
    if (!editor || !range || !editor.contains(range.startContainer) || !editor.contains(range.endContainer)) {
      window.alert("Click inside the article at the exact position for the image, then choose Insert image.");
      return;
    }
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
        <button type="button" title="Insert an editable table at the cursor" onMouseDown={(event) => { event.preventDefault(); saveSelection(); }} onClick={insertTable}>Insert table</button>
        <button type="button" title="Insert image at cursor or inside a table cell" onMouseDown={(event) => { event.preventDefault(); saveSelection(); }} onClick={() => imageInputRef.current?.click()}>Insert image</button>
        <button type="button" title="Edit selected image alternative text and caption" onMouseDown={(event) => { event.preventDefault(); saveSelection(); }} onClick={editImageDetails}>Image details</button>
        <button type="button" title="Move selected image to the current cursor position" onMouseDown={(event) => { event.preventDefault(); saveSelection(); }} onClick={moveSelectedImageToCursor}>Move image</button>
        <button type="button" title="Align selected image left" onMouseDown={(event) => { event.preventDefault(); saveSelection(); }} onClick={() => alignSelectedImage("left")}>Image left</button>
        <button type="button" title="Centre selected image" onMouseDown={(event) => { event.preventDefault(); saveSelection(); }} onClick={() => alignSelectedImage("center")}>Image centre</button>
        <button type="button" title="Align selected image right" onMouseDown={(event) => { event.preventDefault(); saveSelection(); }} onClick={() => alignSelectedImage("right")}>Image right</button>
        <button type="button" title="Make selected image full width" onMouseDown={(event) => { event.preventDefault(); saveSelection(); }} onClick={() => alignSelectedImage("full")}>Image full width</button>
        <button type="button" title="Float image left and wrap text around it" onMouseDown={(event) => { event.preventDefault(); saveSelection(); }} onClick={() => wrapSelectedImage("left")}>Wrap left</button>
        <button type="button" title="Float image right and wrap text around it" onMouseDown={(event) => { event.preventDefault(); saveSelection(); }} onClick={() => wrapSelectedImage("right")}>Wrap right</button>
        <button type="button" title="Remove selected image" onMouseDown={(event) => { event.preventDefault(); saveSelection(); }} onClick={removeSelectedImage}>Remove image</button>
        <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => void insertImage(event)} aria-label="Choose inline image" />
      </div>
      <div ref={editorRef} className="richEditorSurface" contentEditable suppressContentEditableWarning
        role="textbox" aria-label="Article body" aria-multiline="true"
        onInput={(event) => onChange(event.currentTarget.innerHTML)}
        onKeyUp={saveSelection} onMouseUp={saveSelection} onBlur={saveSelection}
        onMouseDown={preventImageCaretJump}
        onClick={rememberClickedImage}
        data-placeholder="Write your article here. Place the cursor to insert a table or image." />
      <p className="richEditorHint">Select text to format it. Insert a table at the cursor, then type in its cells. To add an image inside a cell, click in that cell and choose Insert image. Click an image to select it, edit its alternative text or caption, move it, align it left/centre/right or full width, wrap text around it, or remove it. Save and reopen a test draft to verify the final layout.</p>
    </div>
  );
}
