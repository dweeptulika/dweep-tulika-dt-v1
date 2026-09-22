"use client";

import { useState } from "react";

const sections = [
  ["New Article", "Create a report with headline, slug, category, author, featured image and article body."],
  ["Drafts", "Keep unfinished reports separate from published stories."],
  ["Published", "Review the live newsroom output and article metadata."],
  ["Media Library", "Centralise publication-owned images instead of relying on Blogger media URLs."],
];

export default function AdminPage() {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Andaman News");
  const [author, setAuthor] = useState("Dweep Tulika");
  const [status, setStatus] = useState("Draft");

  return (
    <main className="adminShell">
      <div className="adminTop">
        <div>
          <div className="kicker">Dweep Tulika Newsroom</div>
          <h1>Editorial Dashboard</h1>
          <p>Publishing workspace for the Dweep Tulika digital edition.</p>
        </div>
        <a className="adminBack" href="/">View Website</a>
      </div>

      <div className="adminGrid">
        {sections.map(([name, description]) => (
          <section className="adminCard" key={name}>
            <span className="adminLabel">{name}</span>
            <h2>{name}</h2>
            <p>{description}</p>
          </section>
        ))}
      </div>

      <section className="adminEditor">
        <div className="adminEditorHead">
          <div>
            <div className="adminLabel">New Article</div>
            <h2>Start a report</h2>
          </div>
          <span className="adminStatus">{status}</span>
        </div>

        <label>
          Headline
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter the news headline" />
        </label>

        <div className="adminFormGrid">
          <label>
            Category
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option>Andaman News</option>
              <option>National</option>
              <option>Politics</option>
              <option>Culture</option>
              <option>Business</option>
              <option>Sports</option>
            </select>
          </label>

          <label>
            Author
            <input value={author} onChange={(e) => setAuthor(e.target.value)} />
          </label>
        </div>

        <label>
          Article body
          <textarea rows={12} placeholder="Write or paste the report here..." />
        </label>

        <div className="adminActions">
          <button type="button" onClick={() => setStatus("Draft saved locally")}>Save Draft</button>
          <button type="button" onClick={() => setStatus("Ready for publishing")}>Preview</button>
          <button type="button" onClick={() => setStatus("Publishing backend required")}>Publish</button>
        </div>

        <p className="adminNote">
          This is the newsroom interface foundation. Publishing, authentication, media storage,
          scheduling and database persistence will be connected in the next backend layer; no
          article is published by this screen yet.
        </p>
      </section>
    </main>
  );
}
