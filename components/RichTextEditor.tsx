"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";

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

function closestImageFigure(target: EventTarget | null, editor: HTMLElement): HTMLElement | null {
  if (!(target instanceof Element)) return null;
  // Do not depend on a CSS class surviving HTML normalization. An image figure
  // is any figure inside this editor that still contains an image.
  const figure = target.closest("figure");
  return figure && editor.contains(figure) && figure.querySelector("img")
    ? figure as HTMLElement
    : null;
}

export function RichTextEditor({ value, onChange, onUploadImage }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const savedRange = useRef<Range | null>(null);
  const draggedFigure = useRef<HTMLElement | null>(null);
  // Parent state echoes must not replace live contentEditable DOM or selection.
  const lastEmittedHtml = useRef<string | null>(null);
  const [selectedFigure, setSelectedFigure] = useState<HTMLElement | null>(null);
  const [imageStatus, setImageStatus] = useState("");

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    // Ignore the value echoed back from our own onChange call.
    if (lastEmittedHtml.current === value) return;
    if (el.innerHTML !== value) {
      // If the parent normalizes the HTML, remember which image was selected and
      // rebind selection to the corresponding live DOM node after replacement.
      const figures = Array.from(el.querySelectorAll("figure")).filter((node) => node.querySelector("img"));
      const selectedIndex = selectedFigure ? figures.indexOf(selectedFigure) : -1;
      el.innerHTML = value;
      const nextFigures = Array.from(el.querySelectorAll("figure")).filter((node) => node.querySelector("img"));
      setSelectedFigure(selectedIndex >= 0 ? (nextFigures[selectedIndex] as HTMLElement | undefined) ?? null : null);
      savedRange.current = null;
    }
    lastEmittedHtml.current = value;
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

  function syncEditor() {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    lastEmittedHtml.current = html;
    onChange(html);
  }

  function handleEditorInput(editor: HTMLDivElement) {
    setSelectedFigure(null);
    const html = editor.innerHTML;
    lastEmittedHtml.current = html;
    onChange(html);
  }

  function run(command: string, commandValue?: string) {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    restoreSelection();
    document.execCommand(command, false, commandValue);
    saveSelection();
    syncEditor();
  }

  function addLink() {
    const url = window.prompt("Enter a full link starting with https://");
    if (url && /^https?:\/\//i.test(url.trim())) run("createLink", url.trim());
  }

  async function addInlineImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !onUploadImage) return;
    setImageStatus("Uploading image…");
    try {
      const url = await onUploadImage(file);
      if (!url) {
        setImageStatus("Image was not inserted. Please check the upload message and try again.");
        return;
      }
      const editor = editorRef.current;
      if (!editor) return;
      const range = restoreSelection();
      if (!range) return;
      const figure = document.createElement("figure");
      figure.className = "articleInlineFigure articleImageSizeLarge articleImageAlignCenter";
      figure.draggable = true;
      const image = document.createElement("img");
      image.src = url;
      image.alt = file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
      image.loading = "lazy";
      figure.appendChild(image);
      range.deleteContents();
      range.insertNode(figure);
      const paragraph = document.createElement("p");
      paragraph.appendChild(document.createElement("br"));
      figure.parentNode?.insertBefore(paragraph, figure.nextSibling);
      setSelectedFigure(figure);
      const selection = window.getSelection();
      const nextRange = document.createRange();
      nextRange.selectNodeContents(paragraph);
      nextRange.collapse(true);
      selection?.removeAllRanges();
      selection?.addRange(nextRange);
      savedRange.current = nextRange.cloneRange();
      syncEditor();
      setImageStatus("Image inserted. Select it to adjust layout, caption or alt text.");
    } catch {
      setImageStatus("Image upload failed. Please try again.");
    }
  }

  function updateFigure(mutator: (figure: HTMLElement, image: HTMLImageElement) => void) {
    const figure = selectedFigure;
    const image = figure?.querySelector("img");
    if (!figure || !image || !editorRef.current?.contains(figure)) {
      setSelectedFigure(null);
      return;
    }
    mutator(figure, image);
    syncEditor();
  }

  function setImageSize(size: "small" | "medium" | "large" | "full") {
    updateFigure((figure) => {
      figure.classList.remove("articleImageSizeSmall", "articleImageSizeMedium", "articleImageSizeLarge", "articleImageSizeFull");
      figure.classList.add(`articleImageSize${size[0].toUpperCase()}${size.slice(1)}`);
    });
  }

  function setImageAlignment(alignment: "left" | "center" | "right") {
    updateFigure((figure) => {
      figure.classList.remove("articleImageAlignLeft", "articleImageAlignCenter", "articleImageAlignRight");
      figure.classList.add(`articleImageAlign${alignment[0].toUpperCase()}${alignment.slice(1)}`);
    });
  }

  function setImageWrap(wrap: "none" | "left" | "right") {
    updateFigure((figure) => {
      figure.classList.remove("articleImageWrapNone", "articleImageWrapLeft", "articleImageWrapRight");
      figure.classList.add(`articleImageWrap${wrap[0].toUpperCase()}${wrap.slice(1)}`);
    });
  }

  function moveImage(direction: "earlier" | "later") {
    const figure = selectedFigure;
    const editor = editorRef.current;
    if (!figure || !editor || !editor.contains(figure)) return;
    const isEmptySpacer = (node: Element) =>
      node.tagName === "P" && !(node.textContent ?? "").trim() && !node.querySelector("img,video,iframe");
    if (direction === "earlier") {
      let previous = figure.previousElementSibling;
      while (previous && isEmptySpacer(previous)) previous = previous.previousElementSibling;
      if (previous) previous.parentNode?.insertBefore(figure, previous);
    } else {
      let next = figure.nextElementSibling;
      while (next && isEmptySpacer(next)) next = next.nextElementSibling;
      if (next) next.parentNode?.insertBefore(figure, next.nextElementSibling);
    }
    setSelectedFigure(figure);
    syncEditor();
  }

  function editAltText() {
    const image = selectedFigure?.querySelector("img");
    if (!image) return;
    const alt = window.prompt("Describe what this image shows (for screen readers and search engines):", image.alt);
    if (alt !== null) updateFigure((_figure, target) => { target.alt = alt.trim(); });
  }

  function editCaption() {
    const figure = selectedFigure;
    if (!figure) return;
    const current = figure.querySelector("figcaption")?.textContent ?? "";
    const caption = window.prompt("Caption shown below the image (leave blank to remove):", current);
    if (caption === null) return;
    const existing = figure.querySelector("figcaption");
    if (caption.trim()) {
      const node = existing ?? document.createElement("figcaption");
      node.textContent = caption.trim();
      if (!existing) figure.appendChild(node);
    } else {
      existing?.remove();
    }
    syncEditor();
  }

  function removeImage() {
    const figure = selectedFigure;
    if (!figure) return;
    const next = document.createElement("p");
    next.appendChild(document.createElement("br"));
    figure.replaceWith(next);
    setSelectedFigure(null);
    syncEditor();
    editorRef.current?.focus();
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
            onClick={() => imageInputRef.current?.click()}>Insert image</button>
          <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp"
            onChange={(event) => void addInlineImage(event)} style={{ display: "none" }} aria-hidden="true" tabIndex={-1} />
        </>}
        <button type="button" title="Undo" onMouseDown={(event) => event.preventDefault()} onClick={() => run("undo")}>↶ Undo</button>
        <button type="button" title="Redo" onMouseDown={(event) => event.preventDefault()} onClick={() => run("redo")}>↷ Redo</button>
      </div>

      {selectedFigure && editorRef.current?.contains(selectedFigure) && <>
        <div className="richImageToolbar" role="group" aria-label="Selected image tools">
          <strong>Image selected</strong>
          <label>Size
            <select aria-label="Image size" defaultValue="large"
              value={selectedFigure.classList.contains("articleImageSizeSmall") ? "small" : selectedFigure.classList.contains("articleImageSizeMedium") ? "medium" : selectedFigure.classList.contains("articleImageSizeFull") ? "full" : "large"}
              onChange={(event) => setImageSize(event.target.value as "small" | "medium" | "large" | "full")}>
              <option value="small">Small (25%)</option><option value="medium">Medium (50%)</option>
              <option value="large">Large (75%)</option><option value="full">Full width</option>
            </select>
          </label>
          <label>Align
            <select aria-label="Image alignment" value={selectedFigure.classList.contains("articleImageAlignLeft") ? "left" : selectedFigure.classList.contains("articleImageAlignRight") ? "right" : "center"}
              onChange={(event) => setImageAlignment(event.target.value as "left" | "center" | "right")}>
              <option value="left">Left</option><option value="center">Centre</option><option value="right">Right</option>
            </select>
          </label>
          <label>Text wrapping
            <select aria-label="Image text wrapping" value={selectedFigure.classList.contains("articleImageWrapLeft") ? "left" : selectedFigure.classList.contains("articleImageWrapRight") ? "right" : "none"}
              onChange={(event) => setImageWrap(event.target.value as "none" | "left" | "right")}>
              <option value="none">No wrap</option><option value="left">Wrap text to the right</option><option value="right">Wrap text to the left</option>
            </select>
          </label>
          <button type="button" onClick={editAltText}>Edit alt text</button>
          <button type="button" onClick={() => moveImage("earlier")}>Move earlier</button>
          <button type="button" onClick={() => moveImage("later")}>Move later</button>
          <button type="button" onClick={editCaption}>Edit caption</button>
          <button type="button" className="richImageRemove" onClick={removeImage}>Remove image</button>
          <button type="button" onClick={() => {
            setSelectedFigure(null);
            editorRef.current?.focus();
          }} aria-label="Close image tools">Done</button>
        </div>
        <p className="richEditorHint">Changes apply to the selected image. Click another image to edit it.</p>
      </>}

      <div ref={editorRef} className="richEditorSurface" style={{ textTransform: "none", letterSpacing: "normal" }} contentEditable suppressContentEditableWarning
        role="textbox" aria-label="Article body" aria-multiline="true"
        onInput={(event) => handleEditorInput(event.currentTarget)}
        onDragStart={(event) => {
          const figure = closestImageFigure(event.target, event.currentTarget);
          if (!figure) {
            event.preventDefault();
            return;
          }
          draggedFigure.current = figure;
          figure.draggable = true;
          setSelectedFigure(figure);
          if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", "dweep-tulika-inline-image");
          }
        }}
        onDragOver={(event) => {
          if (draggedFigure.current && event.currentTarget.contains(draggedFigure.current)) {
            // Prevent the browser from inserting the image into a text caret,
            // which is what can split words or sentences during native drop.
            event.preventDefault();
            if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
          }
        }}
        onDrop={(event) => {
          const dragged = draggedFigure.current;
          const editor = event.currentTarget;
          if (!dragged || !editor.contains(dragged)) return;
          event.preventDefault();
          event.stopPropagation();
          const targetFigure = closestImageFigure(event.target, editor);
          if (targetFigure && targetFigure !== dragged) {
            const rect = targetFigure.getBoundingClientRect();
            const insertAfter = event.clientY > rect.top + rect.height / 2;
            targetFigure.parentNode?.insertBefore(dragged, insertAfter ? targetFigure.nextSibling : targetFigure);
          } else if (!targetFigure) {
            // Reposition only against a block boundary; never drop into a text node.
            const target = event.target instanceof Element ? event.target.closest("p,h2,h3,blockquote,ul,ol,figure") : null;
            if (target && editor.contains(target) && target !== dragged) {
              const rect = target.getBoundingClientRect();
              target.parentNode?.insertBefore(dragged, event.clientY > rect.top + rect.height / 2 ? target.nextSibling : target);
            }
          }
          draggedFigure.current = null;
          setSelectedFigure(dragged);
          syncEditor();
        }}
        onDragEnd={() => {
          draggedFigure.current = null;
        }}
        onPointerDown={(event) => {
          const figure = closestImageFigure(event.target, event.currentTarget);
          if (figure) {
            // Select the image before the browser moves its caret/selection.
            // Preventing the native image selection avoids a mouse-up event
            // replacing this state with a text selection.
            event.preventDefault();
            setSelectedFigure(figure);
            return;
          }
          setSelectedFigure(null);
          saveSelection();
        }}
        onContextMenu={(event) => {
          const figure = closestImageFigure(event.target, event.currentTarget);
          if (figure) {
            event.preventDefault();
            setSelectedFigure(figure);
          } else {
            setSelectedFigure(null);
            saveSelection();
          }
        }}
        onClick={(event) => {
          const figure = closestImageFigure(event.target, event.currentTarget);
          if (figure) {
            setSelectedFigure(figure);
          } else {
            setSelectedFigure(null);
            saveSelection();
          }
        }}
        data-placeholder="Write your article here. Select text and use the toolbar to format it." />
      {imageStatus && <p className="richEditorHint" role="status">{imageStatus}</p>}
      <p className="richEditorHint">Tip: click an image to open its editing tools. Select text to format it. Press Enter to start a new paragraph.</p>
    </div>
  );
}
