import Image from "next/image";
import Link from "next/link";
import { SITE_MASTHEAD_LOGO } from "@/lib/seo";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="topline">
        <span>ESTD. 2018 · Sri Vijaya Puram</span>
        <span>Andaman &amp; Nicobar Islands</span>
      </div>
      <div className="masthead">
        <Link href="/" className="mastlink" aria-label="Dweep Tulika home">
          <Image src={SITE_MASTHEAD_LOGO} alt="Dweep Tulika — A Truthful &amp; Unbiased Perspective" width={676} height={270} priority className="officialLogo" />
        </Link>
      </div>
      <nav aria-label="Primary navigation">
        <div className="navinner">
          <Link href="/">Home</Link>
          <Link href="/category/andaman-nicobar">Andaman &amp; Nicobar</Link>
          <Link href="/category/national">National</Link>
          <Link href="/category/politics">Politics</Link>
          <Link href="/category/editorial">Editorial</Link>
          <Link href="/category/culture">Culture</Link>
          <Link href="/category/business">Business</Link>
          <Link href="/category/sports">Sports</Link>
          <Link href="/archive">Archive</Link>
          <Link href="/search">Search</Link>
        </div>
      </nav>
    </header>
  );
}
