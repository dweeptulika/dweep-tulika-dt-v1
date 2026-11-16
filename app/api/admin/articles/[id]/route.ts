import { NextRequest,NextResponse } from "next/server";
import { requireEditor } from "@/lib/auth/authorization";
import { queryNeon } from "@/lib/backend/neon";
type Input={title?:string;slug?:string;category?:string;author?:string;excerpt?:string;body_html?:string;featured_image?:string|null;seo_title?:string|null;meta_description?:string|null;social_image?:string|null;status?:"draft"|"published"|"scheduled";scheduled_for?:string|null;published_at?:string|null};
const fields="id,title,slug,category,source,public_path,author,excerpt,body_html,featured_image,seo_title,meta_description,social_image,status,scheduled_for,published_at,updated_at";
function iso(v?:string|null){if(!v)return null;const d=new Date(v);return Number.isFinite(d.getTime())?d.toISOString():null;}
export async function PATCH(request:NextRequest,context:{params:Promise<{id:string}>}){
 const {actor,response}=await requireEditor();if(response||!actor)return response;
 const {id}=await context.params,input=await request.json() as Input;
 const title=input.title?.trim()||"",slug=input.slug?.trim().toLowerCase()||"",status=input.status||"draft";
 if(!title||title.length>300||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))return NextResponse.json({error:"Headline and valid URL slug are required."},{status:400});
 if(!["draft","published","scheduled"].includes(status))return NextResponse.json({error:"Invalid publishing status."},{status:400});
 if(!(input.body_html||"").trim())return NextResponse.json({error:"Article body is required."},{status:400});
 const scheduledAt=status==="scheduled"?iso(input.scheduled_for):null;
 if(status==="scheduled"&&!scheduledAt)return NextResponse.json({error:"A valid schedule date and time is required."},{status:400});
 const publishedAt=status==="scheduled"?scheduledAt:status==="published"?(iso(input.published_at)||new Date().toISOString()):iso(input.published_at);
 try{
  const rows=await queryNeon(
   "update public.articles set title=$2,slug=$3,category=$4,author=$5,excerpt=$6,body_html=$7,featured_image=$8,seo_title=$9,meta_description=$10,social_image=$11,status=$12,scheduled_for=$13,published_at=$14,updated_by=$15,updated_at=now() where id=$1 returning "+fields,
   [id,title,slug,input.category?.trim()||"Andaman News",input.author?.trim()||"Dweep Tulika",input.excerpt?.trim()||"",input.body_html,input.featured_image||null,input.seo_title?.trim()||null,input.meta_description?.trim()||input.excerpt?.trim()||null,input.social_image||null,status,scheduledAt,publishedAt,actor.id]
  );
  if(!rows[0])return NextResponse.json({error:"Article not found."},{status:404});return NextResponse.json(rows[0]);
 }catch(e){if((e as {code?:string}).code==="23505")return NextResponse.json({error:"That article slug is already in use."},{status:409});console.error("Neon article update failed",e);return NextResponse.json({error:"Could not update the article."},{status:500});}
}
