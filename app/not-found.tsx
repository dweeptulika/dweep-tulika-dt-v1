import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container">
      <article className="article">
        <div className="kicker">Dweep Tulika</div>
        <h1>Page not found</h1>
        <p className="dek">The story or page you requested could not be found.</p>
        <p><Link href="/">Return to Dweep Tulika</Link></p>
      </article>
    </div>
  );
}
