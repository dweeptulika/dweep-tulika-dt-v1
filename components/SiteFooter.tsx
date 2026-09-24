import Link from "next/link";

export function SiteFooter() {
  return (
    <footer>
      <div className="footergrid">
        <div>
          <h2>DWEEP TULIKA</h2>
          <p>A Truthful &amp; Unbiased Perspective.</p>
          <p>Island-centric journalism from Andaman &amp; Nicobar Islands.</p>
          <p><a href="mailto:dweeptulika@gmail.com">dweeptulika@gmail.com</a></p>
        </div>
        <div>
          <h3>Publication</h3>
          <p><Link href="/about">About &amp; Editorial Team</Link></p>
          <p><Link href="/archive">News Archive</Link></p>
          <p><Link href="/search">Search News</Link></p>
          <p><Link href="/advertise">Advertise With Us</Link></p>
          <p><Link href="/p/publication-policies.html">Publication Policies</Link></p>
          <p><Link href="/p/privacy-policy.html">Privacy Policy</Link></p>
          <p><Link href="/p/terms-of-service.html">Terms of Service</Link></p>
        </div>
        <div>
          <h3>Follow Dweep Tulika</h3>
          <p><a href="https://www.facebook.com/DweepTulika" target="_blank" rel="noreferrer">Facebook</a></p>
          <p><a href="https://www.instagram.com/dweeptulika/" target="_blank" rel="noreferrer">Instagram</a></p>
          <p><a href="https://www.youtube.com/channel/UCzmavzxqdwD6IT1lZZsa2_Q" target="_blank" rel="noreferrer">YouTube</a></p>
          <p><a href="https://whatsapp.com/channel/0029VbD1QsWGU3BAufXlYl09" target="_blank" rel="noreferrer">WhatsApp Channel</a></p>
        </div>
      </div>
    </footer>
  );
}
