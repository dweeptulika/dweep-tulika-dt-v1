import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contact Dweep Tulika",
  description:
    "Contact the Dweep Tulika editorial office in Sri Vijaya Puram for news tips, corrections, and reader feedback.",
  alternates: { canonical: "/contact" },
  openGraph: {
    type: "website",
    title: "Contact Dweep Tulika",
    description:
      "Reach the Dweep Tulika editorial office for news tips, corrections, and reader feedback.",
    url: "https://dweeptulika.in/contact",
  },
};

const email = "dweeptulika@gmail.com";

const contactOptions = [
  {
    title: "Editorial enquiries and news tips",
    description:
      "Share information about local developments, public issues, events, documents, or matters that may warrant journalistic attention. Please include the location, date, relevant details, and supporting material where available.",
    subject: "Editorial Enquiry / News Tip",
  },
  {
    title: "Corrections and factual concerns",
    description:
      "If you believe a published report contains a factual error, identify the article and the specific passage in question. Include the correct information and supporting documents or sources so the editorial team can review it.",
    subject: "Correction Request",
  },
  {
    title: "Reader feedback and complaints",
    description:
      "Send feedback about our coverage, accessibility, or a concern regarding material published on this website. Please explain the issue clearly and include the relevant article link, if applicable.",
    subject: "Reader Feedback / Complaint",
  },
];

export default function ContactPage() {
  return (
    <div className="container">
      <article className="article">
        <div className="kicker">Dweep Tulika</div>
        <h1>Contact the Editorial Office</h1>
        <p className="dek">
          We welcome news tips, corrections, and reader feedback from across
          the Andaman &amp; Nicobar Islands and beyond.
        </p>

        <div className="aboutIntro">
          <h2>Dweep Tulika</h2>
          <p>
            <strong>Email:</strong>{" "}
            <a href={`mailto:${email}`}>{email}</a>
          </p>
          <p>
            <strong>Location:</strong> Sri Vijaya Puram, Andaman &amp; Nicobar
            Islands, India
          </p>
          <p>
            Email is the official contact channel currently published for
            editorial and general enquiries. Please do not send passwords,
            financial details, or other sensitive personal information.
          </p>
        </div>

        <h2 className="sectionHeading">Choose the purpose of your enquiry</h2>
        <div className="grid">
          {contactOptions.map((option) => (
            <section className="card" key={option.subject}>
              <h3>{option.title}</h3>
              <p>{option.description}</p>
              <p>
                <a
                  href={`mailto:${email}?subject=${encodeURIComponent(option.subject)}`}
                >
                  Email the editorial office
                </a>
              </p>
            </section>
          ))}
        </div>

        <section className="aboutIntro">
          <h2>Submitting a correction request</h2>
          <ol>
            <li>Include the article headline or its full URL.</li>
            <li>Identify the exact statement you believe is inaccurate.</li>
            <li>Explain the correction and provide supporting evidence.</li>
            <li>
              Include your contact details so the editorial team can seek
              clarification if required.
            </li>
          </ol>
          <p>
            Every request is subject to editorial review. A submission does
            not automatically mean that an article will be changed. Where a
            correction or material update is made, the publication should
            identify the change clearly in the relevant report.
          </p>
          <p>
            Read our <Link href="/p/publication-policies.html">Publication Policies</Link>
            {" "}for our editorial standards and corrections approach.
          </p>
        </section>

        <p>
          <Link href="/">Return to the Dweep Tulika homepage</Link>
        </p>
      </article>
    </div>
  );
}
