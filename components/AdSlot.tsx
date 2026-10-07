import Image from "next/image";
import { getActiveAdvertisements, type Advertisement } from "@/lib/data";

export async function AdSlot({ placement }: { placement: Advertisement["placement"] }) {
  const ads = await getActiveAdvertisements(placement);
  if (!ads.length) return null;
  const ad = ads[0];
  const image = <Image src={ad.imageUrl} alt={ad.advertiser || ad.name} width={1200} height={300} sizes="(max-width: 900px) 100vw, 1200px" style={{ width: "100%", height: "auto" }} />;
  return (
    <section aria-label="Advertisement" className="adSlot">
      {ad.targetUrl ? <a href={ad.targetUrl} target="_blank" rel="sponsored noopener noreferrer">{image}</a> : image}
    </section>
  );
}
