import Link from "next/link";
export function SiteHeader(){return <header className="site-header">
<div className="topline"><span>ESTD. 2018 · Sri Vijaya Puram</span><span>Andaman &amp; Nicobar Islands</span></div>
<div className="masthead"><Link href="/" className="mastlink"><h1>DWEEP <span>TULIKA</span></h1></Link><p>A Truthful &amp; Unbiased Perspective</p></div>
<nav aria-label="Primary navigation"><div className="navinner">
<Link href="/">Home</Link><Link href="/category/andaman-nicobar">Andaman &amp; Nicobar</Link><Link href="/category/national">National</Link><Link href="/category/politics">Politics</Link><Link href="/category/culture">Culture</Link><Link href="/category/business">Business</Link><Link href="/category/sports">Sports</Link><Link href="/search">Search</Link>
</div></nav></header>}