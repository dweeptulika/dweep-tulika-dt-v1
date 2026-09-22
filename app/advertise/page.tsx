import Link from "next/link";

const placements = [
  ["Homepage masthead", "High-visibility placement above the main news grid."],
  ["Homepage news grid", "Brand placement alongside regular editorial stories."],
  ["Article pages", "Placement around individual news reports."],
  ["Sidebar", "Compact desktop placement for recurring campaigns."],
  ["WhatsApp & social promotion", "Discuss sponsored editorial-adjacent promotional packages separately."],
];

export default function AdvertisePage() {
  return (
    <div className="container">
      <article className="article">
        <div className="kicker">Dweep Tulika</div>
        <h1>Advertise With Dweep Tulika</h1>
        <p className="dek">
          Connect your organisation, business, event or public-interest campaign
          with readers across the Andaman &amp; Nicobar Islands.
        </p>

        <div className="aboutIntro">
          <h2>Advertising &amp; Partnerships</h2>
          <p>
            We offer digital advertising opportunities across the Dweep Tulika
            website. Placement, duration, creative specifications and rates can
            be discussed according to the campaign.
          </p>
          <p>
            <strong>For enquiries:</strong>{" "}
            <a href="mailto:dweeptulika@gmail.com">dweeptulika@gmail.com</a>
          </p>
        </div>

        <h2 className="sectionHeading">Available Placements</h2>
        <div className="grid">
          {placements.map(([title, description]) => (
            <section className="card" key={title}>
              <h3>{title}</h3>
              <p>{description}</p>
            </section>
          ))}
        </div>

        <div className="contactBox">
          <h2>Send an Advertising Enquiry</h2>
          <p>
            Please include your organisation/business name, campaign objective,
            preferred dates and the type of placement you are interested in.
          </p>
          <p>
            <a href="mailto:dweeptulika@gmail.com?subject=Advertising%20Enquiry%20-%20Dweep%20Tulika">
              Email the Editorial Office
            </a>
          </p>
          <p><Link href="/">Return to Dweep Tulika homepage</Link></p>
        </div>
      </article>
    </div>
  );
}
