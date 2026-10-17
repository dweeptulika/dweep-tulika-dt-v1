"use client";

import { Node } from "@tiptap/core";

type ImageFigureAttributes = {
  src: string | null;
  alt: string;
  title: string | null;
  caption: string;
  alignment: "left" | "center" | "right" | "full" | null;
  wrap: "left" | "right" | null;
  size: "small" | "medium" | "large" | "full";
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
  const size = classes.contains("dt-image-size-small") ? "small"
    : classes.contains("dt-image-size-large") ? "large"
    : classes.contains("dt-image-size-full") ? "full"
    : "medium";
  return {
    src: image.getAttribute("src"),
    alt: image.getAttribute("alt") || "",
    title: image.getAttribute("title"),
    caption: element.querySelector("figcaption")?.textContent || image.getAttribute("data-caption") || "",
    alignment,
    wrap,
    size,
  };
}

/**
 * A native ProseMirror atom, deliberately without a React NodeView.
 * Native node selection keeps the image in the document while selecting it and
 * avoids React NodeView DOM reconciliation replacing the selected figure.
 */
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
      size: { default: "medium", ...hidden },
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
    const modeClass = attrs.wrap
      ? `dt-image-wrap-${attrs.wrap}`
      : `dt-image-align-${attrs.alignment || "center"}`;
    const imageAttrs: Record<string, string> = {
      src: attrs.src || "",
      alt: attrs.alt || "",
      loading: "lazy",
    };
    if (attrs.title) imageAttrs.title = attrs.title;
    const sizeClass = `dt-image-size-${attrs.size || "medium"}`;
    const children: any[] = [["img", imageAttrs]];
    if (attrs.caption) children.push(["figcaption", {}, attrs.caption]);
    return ["figure", { class: `dt-news-image ${modeClass} ${sizeClass}` }, ...children];
  },
});

export default ImageFigure;
