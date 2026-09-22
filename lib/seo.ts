export const SITE_URL="https://www.dweeptulika.in";
export const SITE_NAME="Dweep Tulika";
export function articleJsonLd(a:any,url:string){
 return {"@context":"https://schema.org","@type":"NewsArticle","headline":a.title,"description":a.description||undefined,"datePublished":a.published,"dateModified":a.updated||a.published,"author":[{"@type":"Person","name":a.author||"Dweep Tulika"}],"publisher":{"@type":"Organization","name":SITE_NAME,"url":SITE_URL},"mainEntityOfPage":{"@type":"WebPage","@id":url},"url":url};
}