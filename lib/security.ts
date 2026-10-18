import sanitizeHtml from "sanitize-html";

const allowedTags = [
  "a","address","article","aside","blockquote","br","caption","code","dd","div","dl","dt",
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
      a: ["http", "https", "mailto"],
      img: ["http", "https"]
    },
    allowProtocolRelative: false,
    disallowedTagsMode: "discard",
    transformTags: {
      a: (tagName, attribs) => {
        const target = attribs.target;
        if (target === "_blank") {
          return {
            tagName,
            attribs: {
              ...attribs,
              rel: Array.from(new Set([...(attribs.rel || "").split(/\\s+/), "noopener", "noreferrer"].filter(Boolean))).join(" ")
            }
          };
        }
        return { tagName, attribs };
      }
    }
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
