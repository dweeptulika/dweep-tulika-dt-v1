"use client";

import { Node } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";

type ImageFigureAttributes = {
  src: string | null;
  alt: string;
  title: string | null;
  caption: string;
  alignment: "left" | "center" | "right" | "full" | null;
  wrap: "left" | "right" | null;
};

function readFigure(element: HTMLElement): ImageFigureAttributes | false {
  const image = element.matches("img") ? element : element.querySelector("img");
  if (!(image instanceof HTMLImageElement) || !image.getAttribute("src")) return false;
  const classes = element.classList;
  const alignment = classes.contains("dt-image-align-left") ? "left"
    : classes.contains("dt-image-align-right") ? "right"
    : classes.contains("dt-image-align-full") ? "full"
    : "center";
  const wrap = classes.contains("dt-image-wrap-left") ? "left"
    : classes.contains("dt-image-wrap-right") ? "right"
    : null;
  return {
    src: image.getAttribute("src"),
    alt: image.getAttribute("alt") || "",
    title: image.getAttribute("title"),
    caption: element.querySelector("figcaption")?.textContent || image.getAttribute("data-caption") || "",
    alignment,
    wrap,
  };
}

function ImageFigureView({ node, selected, editor, getPos }: NodeViewProps) {
  const attrs = node.attrs as ImageFigureAttributes;
  const position = typeof getPos === "function" ? getPos() : undefined;
  const classes = [
    "dt-news-image",
    attrs.wrap ? `dt-image-wrap-${attrs.wrap}` : `dt-image-align-${attrs.alignment || "center"}`,
    selected ? "dt-news-image-selected" : "",
  ].filter(Boolean).join(" ");

  return (
    <NodeViewWrapper
      className={classes}
      data-drag-handle=""
      contentEditable={false}
      onClick={() => {
        if (typeof position === "number") editor.commands.setNodeSelection(position);
      }}
    >
      {attrs.src ? <img src={attrs.src} alt={attrs.alt || ""} title={attrs.title || undefined} draggable={false} loading="lazy" /> : <span>Image unavailable</span>}
      {attrs.caption && <figcaption>{attrs.caption}</figcaption>}
    </NodeViewWrapper>
  );
}

export const ImageFigure = Node.create({
  name: "imageFigure",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    const hidden = { renderHTML: () => ({}) };
    return {
      src: { default: null, ...hidden },
      alt: { default: "", ...hidden },
      title: { default: null, ...hidden },
      caption: { default: "", ...hidden },
      alignment: { default: "center", ...hidden },
      wrap: { default: null, ...hidden },
    };
  },

  parseHTML() {
    return [
      { tag: "figure", getAttrs: (element) => element instanceof HTMLElement ? readFigure(element) : false },
      { tag: "img[src]", getAttrs: (element) => element instanceof HTMLElement ? readFigure(element) : false },
    ];
  },

  renderHTML({ node }) {
    const attrs = node.attrs as ImageFigureAttributes;
    const classes = attrs.wrap
      ? [`dt-image-wrap-${attrs.wrap}`]
      : [`dt-image-align-${attrs.alignment || "center"}`];
    const imageAttrs: Record<string, string> = {
      src: attrs.src || "",
      alt: attrs.alt || "",
      loading: "lazy",
    };
    if (attrs.title) imageAttrs.title = attrs.title;
    const children: any[] = [["img", imageAttrs]];
    if (attrs.caption) children.push(["figcaption", {}, attrs.caption]);
    return ["figure", { class: classes.join(" ") }, ...children];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageFigureView, { as: "figure" });
  },
});

export default ImageFigure;
