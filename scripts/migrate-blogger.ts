import fs from "node:fs";
import path from "node:path";
import { XMLParser } from "fast-xml-parser";

type Entry = {
  "blogger:type"?: string;
  "blogger:status"?: string;
  "blogger:filename"?: string;
  title?: string;
  author?: { name?: string };
  content?: string | { "#text"?: string };
  "blogger:metaDescription"?: string;
  published?: string;
  updated?: string;
  category?: { "@_term"?: string } | Array<{ "@_term"?: string }>;
};

const source = path.resolve(process.argv[2] || "feed(1).atom");
const dataDir = path.resolve("data");

if (!fs.existsSync(source)) {
  throw new Error(`Blogger export not found: ${source}`);
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  cdataPropName: "__cdata",
  textNodeName: "#text",
  trimValues: false,
});

const parsed = parser.parse(fs.readFileSync(source, "utf8"));
const rawEntries = parsed?.feed?.entry;
const entries: Entry[] = Array.isArray(rawEntries)
  ? rawEntries
  : rawEntries
    ? [rawEntries]
    : [];

const text = (value: unknown) => {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const v = value as Record<string, unknown>;
    return String(v["#text"] ?? v.__cdata ?? "");
  }
  return "";
};

const categories = (value: Entry["category"]) => {
  const list = Array.isArray(value) ? value : value ? [value] : [];
  return list.map((x) => String(x?.["@_term"] ?? "")).filter(Boolean);
};

const normalize = (entry: Entry) => {
  const status = String(entry["blogger:status"] ?? "");
  const type = String(entry["blogger:type"] ?? "");
  const filename = String(entry["blogger:filename"] ?? "");
  const html = text(entry.content);

  return {
    id: filename || text(entry.title),
    title: text(entry.title).trim(),
    author: text(entry.author?.name).trim(),
    html,
    description: text(entry["blogger:metaDescription"]).trim(),
    published: text(entry.published),
    updated: text(entry.updated) || text(entry.published),
    labels: categories(entry.category),
    filename,
    status,
    type,
  };
};

const normalized = entries.map(normalize);
const articles = normalized.filter(
  (x) => x.type === "POST" && x.status === "LIVE" && x.filename,
);
const pages = normalized.filter(
  (x) => x.type === "PAGE" && x.status === "LIVE" && x.filename,
);

fs.mkdirSync(dataDir, { recursive: true });
fs.writeFileSync(path.join(dataDir, "articles.json"), JSON.stringify(articles, null, 2) + "\n");
fs.writeFileSync(path.join(dataDir, "pages.json"), JSON.stringify(pages, null, 2) + "\n");

console.log(`Migrated ${articles.length} LIVE posts and ${pages.length} LIVE pages from ${source}`);
