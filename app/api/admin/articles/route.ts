import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requireEditor } from "@/lib/auth/authorization";
import { queryNeon } from "@/lib/backend/neon";
type ArticleStatus="draft"|"published"|"scheduled";
type ArticleInput={title?:string;slug?:string;category?:string;author?:string;excerpt?:string;body_html?:string;featured_image?:string|null;seo_title?:string|null;meta_description?:string|null;social_image?:string|null;status?:ArticleStatus;scheduled_for?:string|null;published_at?:string|null};
const fields="id,title,slug,category,source,public_path,author,excerpt,body_html,featured_image,seo_title,meta_description,social_image,status,scheduled_for,published_at,updated_at";
function validDate(value?:string|null){if(!value)return null;const d=new Date(value);return Number.isFinite(d.getTime())?d.toISOString():null;}
function validate(input:ArticleInput){
 const title=input.title?.trim()||"",slug=input.slug?.trim().toLowerCase()||"",status=input.status||"draft";
 if(!title||title.length>300)return "Headline is required and must be 300 characters or fewer.";
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||slug.length>220)return "A valid URL slug is required.";
 if(!(input.body_html||"").trim())return "Article body is required.";
 if(!["draft","published","scheduled"].includes(status))return "Invalid publishing status.";
 if(status==="scheduled"&&!validDate(input.scheduled_for))return "A valid schedule date and time is required.";
 return null;
}
export async function GET(){
 const {response}=await requireEditor();if(response)return response;
 const rows=await queryNeon("select "+fields+" from public.articles order by updated_at desc");
 return NextResponse.json(rows,{headers:{"Cache-Control":"private, no-store"}});
}
export async function POST(request:NextRequest){
 const {actor,response}=await requireEditor();if(response||!actor)return response;
 const input=await request.json() as ArticleInput;const error=validate(input);
 if(error)return NextResponse.json({error},{status:400});
 const status=input.status||"draft",scheduledAt=status==="scheduled"?validDate(input.scheduled_for):null;
 const publishedAt=status==="published"?(validDate(input.published_at)||new Date().toISOString()):scheduledAt;
 try{
  const rows=await queryNeon(
   "insert into public.articles (id,title,slug,category,author,excerpt,body_html,featured_image,seo_title,meta_description,social_image,status,scheduled_for,published_at,created_by,updated_by) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$15) returning "+fields,
   [randomUUID(),input.title!.trim(),input.slug!.trim().toLowerCase(),input.category?.trim()||"Andaman News",input.author?.trim()||"Dweep Tulika",input.excerpt?.trim()||"",input.body_html,input.featured_image||null,input.seo_title?.trim()||null,input.meta_description?.trim()||input.excerpt?.trim()||null,input.social_image||null,status,scheduledAt,publishedAt,actor.id]
  );
  return NextResponse.json(rows[0],{status:201});
 }catch(e){if((e as {code?:string}).code==="23505")return NextResponse.json({error:"That article slug is already in use."},{status:409});console.error("Neon article insert failed",e);return NextResponse.json({error:"Could not save the article."},{status:500});}
}
