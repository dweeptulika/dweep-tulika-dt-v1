import { NextRequest,NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requireEditor } from "@/lib/auth/authorization";
import { queryNeon } from "@/lib/backend/neon";
import { liveArticles,articleImage,articleSlug,canonicalCategory } from "@/lib/data";
function normalizePath(v:string){try{return new URL(v,"https://dweeptulika.in").pathname.replace(/\/+$/,"")||"/";}catch{return (v.startsWith("/")?v:"/"+v).replace(/\/+$/,"")||"/";}}
function summary(a:(typeof liveArticles)[number]){return {id:String(a.id),title:a.title,slug:articleSlug(a),publicPath:a.filename,category:canonicalCategory(a.labels,a.title),author:a.author||"Dweep Tulika",excerpt:a.description||"",featuredImage:articleImage(a),publishedAt:a.published,updatedAt:a.updated||a.published,labels:a.labels};}
export async function GET(request:NextRequest){
 const {response}=await requireEditor();if(response)return response;
 const path=request.nextUrl.searchParams.get("path");
 if(path){const a=liveArticles.find(x=>normalizePath(x.filename)===normalizePath(path));if(!a)return NextResponse.json({error:"Legacy story not found"},{status:404});return NextResponse.json({...summary(a),bodyHtml:a.html},{headers:{"Cache-Control":"private, no-store"}});}
 return NextResponse.json(liveArticles.map(summary).sort((a,b)=>Date.parse(b.updatedAt||b.publishedAt)-Date.parse(a.updatedAt||a.publishedAt)),{headers:{"Cache-Control":"private, no-store"}});
}
export async function POST(request:NextRequest){
 const {actor,response}=await requireEditor();if(response||!actor)return response;
 const input=await request.json() as {publicPath?:string},path=input.publicPath?.trim();
 if(!path)return NextResponse.json({error:"A legacy article path is required."},{status:400});
 const a=liveArticles.find(x=>normalizePath(x.filename)===normalizePath(path));if(!a)return NextResponse.json({error:"Legacy story not found."},{status:404});
 const publishedAt=new Date(a.published);if(!Number.isFinite(publishedAt.getTime()))return NextResponse.json({error:"The legacy story has no valid publication date."},{status:400});
 try{
  const exists=await queryNeon<{id:string}>("select id from public.articles where public_path=$1 limit 1",[a.filename]);
  if(exists[0])return NextResponse.json({error:"This Blogger story has already been adopted."},{status:409});
  const sql="insert into public.articles (id,title,slug,category,source,legacy_id,legacy_url,public_path,author,excerpt,body_html,featured_image,seo_title,meta_description,status,published_at,created_by,updated_by) values ($1,$2,$3,$4,'blogger',$5,$6,$7,$8,$9,$10,$11,$12,$13,'published',$14,$15,$15) returning id,title,slug,category,author,excerpt,body_html,featured_image,seo_title,meta_description,social_image,status,scheduled_for,published_at,updated_at";
  const rows=await queryNeon(sql,[randomUUID(),a.title,articleSlug(a),canonicalCategory(a.labels,a.title),String(a.id),a.filename,a.filename,a.author||"Dweep Tulika",a.description||"",a.html||"",articleImage(a),a.title,a.description||null,publishedAt.toISOString(),actor.id]);
  return NextResponse.json(rows[0],{status:201});
 }catch(e){if((e as {code?:string}).code==="23505")return NextResponse.json({error:"This Blogger story or slug has already been adopted."},{status:409});console.error("Legacy Blogger adoption failed",e);return NextResponse.json({error:"The legacy story could not be adopted."},{status:500});}
}
