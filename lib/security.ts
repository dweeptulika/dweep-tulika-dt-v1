import sanitizeHtml from "sanitize-html";

const allowedTags = [
  "a","address","article","aside","blockquote","br","caption","code","dd","div","dl","dt",
  "em","figcaption","figure","footer","h1","h2","h3","h4","h5","h6","header","hr",
  "i","img","li","main","ol","p","pre","section","small","span","strong","sub","sup",
  "table","tbody","td","tfoot","th","thead","tr","u","ul"
];

function optimizeSupabaseStorageImage(value: string | undefined): string | undefined {
  if (!value || value.startsWith("/_next/image?")) return value;
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      !url.hostname.endsWith(".supabase.co") ||
      !url.pathname.startsWith("/storage/v1/object/public/")
    ) return value;
    return `/_next/image?url=${encodeURIComponent(url.toString())}&w=1200&q=75`;
  } catch {
    return value;
  }
}

export function sanitizeArticleHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags,
    allowedAttributes: {
      a: ["href", "target", "rel", "title"],
      img: ["src", "alt", "title", "width", "height", "loading"],
      "*": ["class", "id", "style"]
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: {
      a: ["http", "https", "mailto"],
      img: ["http", "https"]
    },
    allowedStyles: {
      "*": {
        "text-align": [/^(left|right|center|justify)$/]
      }
    },
    allowProtocolRelative: false,
    disallowedTagsMode: "discard",
    transformTags: {
      img: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, src: optimizeSupabaseStorageImage(attribs.src) || attribs.src }
      }),
      a: (tagName, attribs) => {
        if (attribs.target === "_blank") {
          return {
            tagName,
            attribs: {
              ...attribs,
              rel: Array.from(new Set([...(attribs.rel || "").split(/\s+/), "noopener", "noreferrer"].filter(Boolean))).join(" ")
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
