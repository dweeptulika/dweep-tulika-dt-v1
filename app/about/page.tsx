import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About Dweep Tulika — Andaman & Nicobar News Publication",
  description: "Learn about Dweep Tulika, its digital news publication in English and Hindi, Bengali monthly newspaper, editorial team and island-focused journalism.",
  alternates: { canonical: "/about" },
  openGraph: {
    type: "website",
    title: "About Dweep Tulika — Andaman & Nicobar News Publication",
    description: "Meet the team behind Dweep Tulika and learn about its digital and print editions and island-focused public-interest reporting.",
    url: "https://dweeptulika.in/about",
  },
};

const profiles = [
  {
    name: "R. Vineeth",
    role: "Editor-in-Chief",
    image: "/images/team/r-vineeth.webp",
    text:
      "Former Indian Air Force personnel and journalist from the Andaman & Nicobar Islands associated with regional journalism, public affairs, and cultural documentation through Dweep Tulika. With prior experience across demanding operational environments and a continued association with mountaineering and adventure activities, his work reflects resilience, field exposure, and grassroots engagement with island realities.",
  },
  {
    name: "Birendra Kishore Talukdar",
    role: "Publisher & Editor, Bengali Monthly Newspaper",
    image:
      "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhu4UqeXIK0MARkWP6RvhreOnb_7jlnvFSUrDfmiCYA61f_NbNpWQmzZBAhWL7mP8AZmLn_zu7CMuSDt_4wUhUH98acP1LQNRejIrOEHBnfxGGfK6R0B56i0z2fLwdNP1__RjkqCEFan6DGnKoppsXYJuRs-WVk2nSSnfq3e5QpEUEX2AlPy9SWIK-1DFU/s320/WhatsApp%20Image%202025-06-29%20at%202.22.22%20PM.jpeg",
    text:
      "Senior cultural personality from the Andaman & Nicobar Islands associated with performing arts, regional cultural activities and community engagement for several decades. A respected artist and recipient of multiple honours across the fields of art and culture, he has remained actively involved in cultural preservation, public communication and community outreach initiatives. He has also contributed to journalism and public-interest reporting through Dweep Tulika.",
  },
  {
    name: "Mrs. Chapala Talukdar",
    role: "Sub Editor / Proof Reader",
    image: "/images/team/chapala-talukdar.webp",
    text:
      "Mrs. Chapala Talukdar serves as the Sub Editor and Proof Reader of Dweep Tulika, contributing to the publication’s editorial accuracy, language refinement, and content quality. With a keen eye for detail and a strong command over editorial standards, she plays an important role in maintaining the clarity, professionalism, and credibility of the newspaper.",
  },
];

export default function AboutPage() {
  return (
    <div className="container">
      <article className="article aboutPage">
        <div className="kicker">Dweep Tulika</div>
        <h1>About the Publication</h1>
        <p className="dek">
          Dweep Tulika is an island-focused news publication from the Andaman & Nicobar Islands. Its digital edition publishes news and public-interest reporting in English and Hindi, while its Bengali monthly newspaper documents the region’s social, cultural, political and community life. The publication covers governance, education, culture, civic issues and regional developments with a commitment to a truthful and unbiased perspective.
        </p>

        <div className="aboutIntro">
          <h2>Dweep Tulika</h2>
          <p><strong>Regd. No. ANDBEN/2018/75653</strong></p>
          <p>
            Focused on grassroots reporting and island realities, the
            publication aims to preserve public discourse while documenting
            the evolving social, cultural, and political landscape of the
            islands.
          </p>
        </div>

        <h2 className="sectionHeading">Editorial &amp; Publishing Team</h2>
        <div className="profileGrid">
          {profiles.map((profile) => (
            <section className="teamCard" key={profile.name}>
              <Image
                src={profile.image}
                alt={profile.name}
                width={150}
                height={150}
                className="teamImage"
              />
              <h3>{profile.name}</h3>
              <div className="teamRole">{profile.role}</div>
              <p>{profile.text}</p>
            </section>
          ))}
        </div>

        <div className="contactBox">
          <h2>Connect with Dweep Tulika</h2>
          <div className="socialLinks">
            <a href="https://www.facebook.com/DweepTulika" target="_blank" rel="noreferrer">Facebook</a>
            <a href="https://www.instagram.com/dweeptulika/" target="_blank" rel="noreferrer">Instagram</a>
            <a href="https://www.youtube.com/channel/UCzmavzxqdwD6IT1lZZsa2_Q" target="_blank" rel="noreferrer">YouTube</a>
            <a href="https://whatsapp.com/channel/0029VbD1QsWGU3BAufXlYl09" target="_blank" rel="noreferrer">WhatsApp</a>
            <a href="mailto:dweeptulika@gmail.com">Email</a>
          </div>
          <p><Link href="/">Return to Dweep Tulika homepage</Link></p>
        </div>
      </article>
    </div>
  );
}
