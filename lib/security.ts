import sanitizeHtml from "sanitize-html";

const allowedTags = [
  "address","article","aside","blockquote","br","caption","code","dd","div","dl","dt",
  "em","figcaption","figure","footer","h1","h2","h3","h4","h5","h6","header","hr",
  "i","img","li","main","ol","p","pre","section","small","span","strong","sub","sup",
  "table","tbody","td","tfoot","th","thead","tr","u","ul"
];

export function sanitizeArticleHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags,
    allowedAttributes: {
      a: ["href", "target", "rel", "title"],
      img: ["src", "alt", "title", "width", "height", "loading"],
      "*": ["class", "id"]
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: {
      img: ["http", "https"]
    },
    allowProtocolRelative: false,
    disallowedTagsMode: "discard"
  });
}

export function safeExternalUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
  } catch {
    return null;
  }
}
