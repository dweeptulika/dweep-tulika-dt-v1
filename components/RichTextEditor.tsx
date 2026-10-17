"use client";

import { useCallback, useMemo, useRef, useState, type ChangeEvent, type MouseEvent } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { TextAlign } from "@tiptap/extension-text-align";
import { TableKit } from "@tiptap/extension-table";
import { Placeholder } from "@tiptap/extensions";
import { NodeSelection } from "@tiptap/pm/state";
import ImageFigure from "@/components/ImageFigure";

type Props = {
  value: string;
  onChange: (html: string) => void;
  onUploadImage: (file: File) => Promise<{ url: string; alt: string } | null>;
};

type PendingMove = { node: JSONContent };

export function RichTextEditor({ value, onChange, onUploadImage }: Props) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pendingMoveRef = useRef<PendingMove | null>(null);
  const [selectedImage, setSelectedImage] = useState(false);
  const [moveMode, setMoveMode] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [historyState, setHistoryState] = useState({ canUndo: false, canRedo: false });

  // Keep extension instances stable across selection/toolbar state updates.
  const extensions = useMemo(() => [
    StarterKit,
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    TableKit.configure({ table: { resizable: true } }),
    Placeholder.configure({ placeholder: "Write your article here. Place the cursor to insert a table or image." }),
    ImageFigure,
  ], []);

  const editor = useEditor({
    immediatelyRender: false,
    content: value || "",
    extensions,
    editorProps: {
      attributes: {
        class: "ProseMirror",
        "aria-label": "Article body",
        "aria-multiline": "true",
        spellcheck: "true",
      },
      // Select the atom on pointer-down, before browser caret/drag handling can
      // move the selection away from it. This is the primary selection path.
      handleDOMEvents: {
        mousedown: (view, event) => {
          const target = event.target;
          if (!(target instanceof Element)) return false;
          const figure = target.closest("figure.dt-news-image");
          if (!figure) return false;
          const imagePosition = { current: null as number | null };
          view.state.doc.descendants((node, pos) => {
            if (node.type.name === "imageFigure" && view.nodeDOM(pos) === figure) {
              imagePosition.current = pos;
              return false;
            }
            return true;
          });
          if (imagePosition.current === null) return false;
          event.preventDefault();
          view.focus();
          view.dispatch(view.state.tr.setSelection(NodeSelection.create(view.state.doc, imagePosition.current)));
          return true;
        },
      },
      // Backup selection path for browsers that dispatch click without mousedown.
      handleClickOn: (view, _pos, node, nodePos) => {
        if (node.type.name !== "imageFigure") return false;
        view.dispatch(view.state.tr.setSelection(NodeSelection.create(view.state.doc, nodePos)));
        return true;
      },
    },
    onUpdate: ({ editor: current }) => {
      const html = current.getHTML();
      onChange(html);
    },
    onSelectionUpdate: ({ editor: current }) => {
      const selection = current.state.selection;
      setSelectedImage(selection instanceof NodeSelection && selection.node.type.name === "imageFigure");
    },
    onTransaction: ({ editor: current }) => {
      setHistoryState({ canUndo: current.can().undo(), canRedo: current.can().redo() });
    },
  });

  // Intentionally do not mirror every parent value update back into the editor.
  // The parent updates "body" on every keystroke; setContent() here would replace
  // the document and clear node selections. Article changes remount this editor
  // via key={editingId || "new-article"} in the parent, so external loads are handled.


  const toolbarMouseDown = (event: MouseEvent<HTMLButtonElement>) => event.preventDefault();

  const applyTextAlign = (alignment: "left" | "center" | "right" | "justify") => {
    if (!editor) return;
    editor.chain().focus().setTextAlign(alignment).run();
  };

  const applyImageAlign = (alignment: "left" | "center" | "right" | "full") => {
    if (!editor || !selectedImage) return;
    editor.chain().focus().updateAttributes("imageFigure", { alignment, wrap: null }).run();
  };

  const applyImageWrap = (wrap: "left" | "right") => {
    if (!editor || !selectedImage) return;
    editor.chain().focus().updateAttributes("imageFigure", { alignment: null, wrap }).run();
  };

  const applyImageSize = (size: "small" | "medium" | "large" | "full") => {
    if (!editor || !selectedImage) return;
    editor.chain().focus().updateAttributes("imageFigure", { size }).run();
  };

  const editImageDetails = () => {
    if (!editor || !selectedImage) return;
    const attrs = editor.getAttributes("imageFigure");
    const alt = window.prompt("Describe this image for accessibility (alternative text):", attrs.alt || "");
    if (alt === null) return;
    const caption = window.prompt("Image caption (leave blank for no caption):", attrs.caption || "");
    if (caption === null) return;
    editor.chain().focus().updateAttributes("imageFigure", { alt: alt.trim(), caption: caption.trim() }).run();
  };

  const removeSelectedImage = () => {
    if (!editor || !selectedImage) return;
    editor.chain().focus().deleteSelection().run();
  };

  const startMoveSelectedImage = () => {
    if (!editor || !(editor.state.selection instanceof NodeSelection) || editor.state.selection.node.type.name !== "imageFigure") return;
    pendingMoveRef.current = { node: editor.state.selection.node.toJSON() };
    editor.chain().focus().deleteSelection().run();
    setMoveMode(true);
  };

  const cancelMove = () => {
    if (editor && pendingMoveRef.current) {
      editor.chain().focus().insertContent(pendingMoveRef.current.node).run();
    }
    pendingMoveRef.current = null;
    setMoveMode(false);
  };

  const handleEditorClick = useCallback(() => {
    if (!editor || !pendingMoveRef.current) return;
    const node = pendingMoveRef.current.node;
    const position = editor.state.selection.from;
    editor.chain().focus().insertContentAt(position, node).run();
    pendingMoveRef.current = null;
    setMoveMode(false);
  }, [editor]);

  const addLink = () => {
    if (!editor) return;
    const current = editor.getAttributes("link").href || "";
    const value = window.prompt("Enter a full link URL (https://…):", current);
    if (value === null) return;
    const url = value.trim();
    if (!url) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    if (!/^(https?:\/\/|mailto:)/i.test(url)) {
      window.alert("Enter a complete https:// or mailto: URL.");
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const insertTable = () => {
    if (!editor) return;
    const rowInput = window.prompt("How many rows? (1–20)", "3");
    if (rowInput === null) return;
    const rows = Number(rowInput);
    if (!Number.isInteger(rows) || rows < 1 || rows > 20) {
      window.alert("Enter a whole number of rows between 1 and 20.");
      return;
    }
    const columnInput = window.prompt("How many columns? (1–10)", "3");
    if (columnInput === null) return;
    const cols = Number(columnInput);
    if (!Number.isInteger(cols) || cols < 1 || cols > 10) {
      window.alert("Enter a whole number of columns between 1 and 10.");
      return;
    }
    editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
  };

  async function insertImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !editor || uploading) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      window.alert("Choose a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      window.alert("Inline images must be 10 MB or smaller.");
      return;
    }
    setUploading(true);
    try {
      const uploaded = await onUploadImage(file);
      if (!uploaded) return;
      editor.chain().focus().insertContent({
        type: "imageFigure",
        attrs: {
          src: uploaded.url,
          alt: uploaded.alt,
          title: null,
          caption: uploaded.alt,
          alignment: "center",
          wrap: null,
        },
      }).run();
    } finally {
      setUploading(false);
    }
  }

  if (!editor) {
    return <div className="richEditor"><div className="richEditorLoading">Loading newsroom editor…</div></div>;
  }

  return (
    <div className="richEditor">
      <div className="richToolbar" role="toolbar" aria-label="Article formatting">
        <button type="button" title="Undo last change" disabled={!historyState.canUndo} onMouseDown={toolbarMouseDown} onClick={() => editor.chain().focus().undo().run()}>Undo</button>
        <button type="button" title="Redo last undone change" disabled={!historyState.canRedo} onMouseDown={toolbarMouseDown} onClick={() => editor.chain().focus().redo().run()}>Redo</button>
        <span className="richToolbarDivider" aria-hidden="true" />
        <button type="button" title="Bold" aria-pressed={editor.isActive("bold")} onMouseDown={toolbarMouseDown} onClick={() => editor.chain().focus().toggleBold().run()}><strong>B</strong></button>
        <button type="button" title="Italic" aria-pressed={editor.isActive("italic")} onMouseDown={toolbarMouseDown} onClick={() => editor.chain().focus().toggleItalic().run()}><em>I</em></button>
        <button type="button" title="Underline" aria-pressed={editor.isActive("underline")} onMouseDown={toolbarMouseDown} onClick={() => editor.chain().focus().toggleUnderline().run()}><u>U</u></button>
        <button type="button" title="Strikethrough" aria-pressed={editor.isActive("strike")} onMouseDown={toolbarMouseDown} onClick={() => editor.chain().focus().toggleStrike().run()}><s>S</s></button>
        <button type="button" title="Heading 2" aria-pressed={editor.isActive("heading", { level: 2 })} onMouseDown={toolbarMouseDown} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</button>
        <button type="button" title="Heading 3" aria-pressed={editor.isActive("heading", { level: 3 })} onMouseDown={toolbarMouseDown} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</button>
        <button type="button" title="Paragraph" onMouseDown={toolbarMouseDown} onClick={() => editor.chain().focus().setParagraph().run()}>¶</button>
        <button type="button" title="Block quote" aria-pressed={editor.isActive("blockquote")} onMouseDown={toolbarMouseDown} onClick={() => editor.chain().focus().toggleBlockquote().run()}>❝</button>
        <button type="button" title="Bulleted list" aria-pressed={editor.isActive("bulletList")} onMouseDown={toolbarMouseDown} onClick={() => editor.chain().focus().toggleBulletList().run()}>• List</button>
        <button type="button" title="Numbered list" aria-pressed={editor.isActive("orderedList")} onMouseDown={toolbarMouseDown} onClick={() => editor.chain().focus().toggleOrderedList().run()}>1. List</button>
        <button type="button" title="Insert or edit link" onMouseDown={toolbarMouseDown} onClick={addLink}>Link</button>
        <span className="richToolbarDivider" aria-hidden="true" />
        <button type="button" title="Align text left" onMouseDown={toolbarMouseDown} onClick={() => applyTextAlign("left")}>Text ←</button>
        <button type="button" title="Centre text" onMouseDown={toolbarMouseDown} onClick={() => applyTextAlign("center")}>Text ↔</button>
        <button type="button" title="Align text right" onMouseDown={toolbarMouseDown} onClick={() => applyTextAlign("right")}>Text →</button>
        <button type="button" title="Justify text" onMouseDown={toolbarMouseDown} onClick={() => applyTextAlign("justify")}>Justify</button>
        <span className="richToolbarDivider" aria-hidden="true" />
        <button type="button" title="Insert a table at the cursor" onMouseDown={toolbarMouseDown} onClick={insertTable}>Insert table</button>
        <button type="button" title="Insert image at the cursor" disabled={uploading} onMouseDown={toolbarMouseDown} onClick={() => imageInputRef.current?.click()}>{uploading ? "Uploading…" : "Insert image"}</button>
        <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => void insertImage(event)} aria-label="Choose inline image" />
        <>
          <span className="richToolbarDivider" aria-hidden="true" />
          <span className="richToolbarLabel">{selectedImage ? "Selected image" : "Image tools (select an image)"}</span>
          <button type="button" title="Edit image alternative text and caption" disabled={!selectedImage} onMouseDown={toolbarMouseDown} onClick={editImageDetails}>Image details</button>
          <button type="button" title="Align image left" disabled={!selectedImage} onMouseDown={toolbarMouseDown} onClick={() => applyImageAlign("left")}>Image left</button>
          <button type="button" title="Centre image" disabled={!selectedImage} onMouseDown={toolbarMouseDown} onClick={() => applyImageAlign("center")}>Image centre</button>
          <button type="button" title="Align image right" disabled={!selectedImage} onMouseDown={toolbarMouseDown} onClick={() => applyImageAlign("right")}>Image right</button>
          <button type="button" title="Make image full width" disabled={!selectedImage} onMouseDown={toolbarMouseDown} onClick={() => applyImageAlign("full")}>Full width</button>
          <button type="button" title="Set image width to 25%" disabled={!selectedImage} onMouseDown={toolbarMouseDown} onClick={() => applyImageSize("small")}>Size 25%</button>
          <button type="button" title="Set image width to 50%" disabled={!selectedImage} onMouseDown={toolbarMouseDown} onClick={() => applyImageSize("medium")}>Size 50%</button>
          <button type="button" title="Set image width to 75%" disabled={!selectedImage} onMouseDown={toolbarMouseDown} onClick={() => applyImageSize("large")}>Size 75%</button>
          <button type="button" title="Set image width to 100%" disabled={!selectedImage} onMouseDown={toolbarMouseDown} onClick={() => applyImageSize("full")}>Size 100%</button>
          <button type="button" title="Wrap text to the left of image" disabled={!selectedImage} onMouseDown={toolbarMouseDown} onClick={() => applyImageWrap("left")}>Wrap left</button>
          <button type="button" title="Wrap text to the right of image" disabled={!selectedImage} onMouseDown={toolbarMouseDown} onClick={() => applyImageWrap("right")}>Wrap right</button>
          <button type="button" title="Move image to another cursor position" disabled={!selectedImage} onMouseDown={toolbarMouseDown} onClick={startMoveSelectedImage}>Move image</button>
          <button type="button" title="Remove selected image" disabled={!selectedImage} onMouseDown={toolbarMouseDown} onClick={removeSelectedImage}>Remove image</button>
        </>
        {moveMode && <button type="button" title="Cancel image move and restore image" onMouseDown={toolbarMouseDown} onClick={cancelMove}>Cancel move</button>}
      </div>
      {moveMode && <p className="richEditorMoveNotice" role="status">Move mode: click the position in the article where the image should be placed. The image will be inserted there. <button type="button" onMouseDown={toolbarMouseDown} onClick={cancelMove}>Cancel</button></p>}
      <EditorContent editor={editor} className="richEditorSurface" onClick={handleEditorClick} />
      <p className="richEditorHint">Click an image to select it; the image stays in the article while selected. Drag an image to reposition it, or use Move image and then click its new position. Use Image details for alternative text and captions. Text wrapping and alignment are separate controls. Undo and Redo track editor changes.</p>
    </div>
  );
}

export default RichTextEditor;
