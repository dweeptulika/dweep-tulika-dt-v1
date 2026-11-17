import { NextRequest,NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requireEditor } from "@/lib/auth/authorization";
import { queryNeon } from "@/lib/backend/neon";
type Input={name?:string;advertiser?:string;image_url?:string;target_url?:string|null;placement?:"homepage"|"article"|"sidebar";active?:boolean;starts_at?:string|null;ends_at?:string|null};
const fields="id,name,advertiser,image_url,target_url,placement,active,starts_at,ends_at,created_at,updated_at";
function iso(v?:string|null){if(!v)return null;const d=new Date(v);return Number.isFinite(d.getTime())?d.toISOString():null;}
function validUrl(v?:string|null){if(!v)return false;try{const u=new URL(v);return u.protocol==="https:"||u.protocol==="http:";}catch{return false;}}
export async function GET(){const {response}=await requireEditor();if(response)return response;const rows=await queryNeon("select "+fields+" from public.advertisements order by created_at desc");return NextResponse.json(rows,{headers:{"Cache-Control":"private, no-store"}});}
export async function POST(request:NextRequest){
 const {actor,response}=await requireEditor();if(response||!actor)return response;
 const input=await request.json() as Input;if(!input.name?.trim()||!validUrl(input.image_url))return NextResponse.json({error:"Advertisement name and a valid image URL are required."},{status:400});
 const placement=input.placement||"homepage";if(!["homepage","article","sidebar"].includes(placement))return NextResponse.json({error:"Invalid advertisement placement."},{status:400});
 const starts=iso(input.starts_at),ends=iso(input.ends_at);if((input.starts_at&&!starts)||(input.ends_at&&!ends))return NextResponse.json({error:"Invalid advertisement date."},{status:400});
 if(starts&&ends&&new Date(ends)<=new Date(starts))return NextResponse.json({error:"End time must be after start time."},{status:400});
 if(input.target_url&&!validUrl(input.target_url))return NextResponse.json({error:"The click destination must be a valid HTTP or HTTPS URL."},{status:400});
 const rows=await queryNeon("insert into public.advertisements (id,name,advertiser,image_url,target_url,placement,active,starts_at,ends_at,created_by,updated_by) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10) returning "+fields,[randomUUID(),input.name.trim(),input.advertiser?.trim()||"",input.image_url,input.target_url?.trim()||null,placement,input.active??true,starts,ends,actor.id]);
 return NextResponse.json(rows[0],{status:201});
}
