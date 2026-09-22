import { getAllPublishedArticles } from "@/lib/data";
export default async function Archive(){const a=await getAllPublishedArticles();return <main>{a.length}</main>}