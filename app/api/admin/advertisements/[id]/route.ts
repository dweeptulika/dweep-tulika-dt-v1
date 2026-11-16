import { NextRequest,NextResponse } from "next/server";
import { requireEditor } from "@/lib/auth/authorization";
import { queryNeon } from "@/lib/backend/neon";
type Input={name?:string;advertiser?:string;image_url?:string;target_url?:string|null;placement?:"homepage"|"article"|"sidebar";active?:boolean;starts_at?:string|null;ends_at?:string|null};
const fields="id,name,advertiser,image_url,target_url,placement,active,starts_at,ends_at,created_at,updated_at";
function iso(v?:string|null){if(!v)return null;const d=new Date(v);return Number.isFinite(d.getTime())?d.toISOString():null;}
function validUrl(v?:string|null){if(!v)return false;try{const u=new URL(v);return u.protocol==="https:"||u.protocol==="http:";}catch{return false;}}
export async function PATCH(request:NextRequest,context:{params:Promise<{id:string}>}){
 const {actor,response}=await requireEditor();if(response||!actor)return response;const {id}=await context.params,input=await request.json() as Input;
 if(!input.name?.trim()||!validUrl(input.image_url))return NextResponse.json({error:"Advertisement name and a valid image URL are required."},{status:400});
 const placement=input.placement||"homepage";if(!["homepage","article","sidebar"].includes(placement))return NextResponse.json({error:"Invalid advertisement placement."},{status:400});
 const starts=iso(input.starts_at),ends=iso(input.ends_at);if((input.starts_at&&!starts)||(input.ends_at&&!ends))return NextResponse.json({error:"Invalid advertisement date."},{status:400});
 if(starts&&ends&&new Date(ends)<=new Date(starts))return NextResponse.json({error:"End time must be after start time."},{status:400});
 if(input.target_url&&!validUrl(input.target_url))return NextResponse.json({error:"The click destination must be a valid HTTP or HTTPS URL."},{status:400});
 const rows=await queryNeon("update public.advertisements set name=$2,advertiser=$3,image_url=$4,target_url=$5,placement=$6,active=$7,starts_at=$8,ends_at=$9,updated_by=$10,updated_at=now() where id=$1 returning "+fields,[id,input.name.trim(),input.advertiser?.trim()||"",input.image_url,input.target_url?.trim()||null,placement,input.active??true,starts,ends,actor.id]);
 if(!rows[0])return NextResponse.json({error:"Advertisement not found."},{status:404});return NextResponse.json(rows[0]);
}
export async function DELETE(_request:NextRequest,context:{params:Promise<{id:string}>}){
 const {response}=await requireEditor();if(response)return response;const {id}=await context.params;
 const rows=await queryNeon("delete from public.advertisements where id=$1 returning id",[id]);if(!rows[0])return NextResponse.json({error:"Advertisement not found."},{status:404});return NextResponse.json({ok:true});
}
