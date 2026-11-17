import { NextRequest,NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requireAdmin } from "@/lib/auth/authorization";
import { queryNeon } from "@/lib/backend/neon";
type Input={name?:string;designation?:string;department?:string;biography?:string;tagline?:string|null;image_url?:string|null;sort_order?:number;is_active?:boolean};
const fields="id,name,designation,department,biography,tagline,image_url,sort_order,is_active,created_at,updated_at";
function validUrl(v?:string|null){if(!v)return true;try{const u=new URL(v);return u.protocol==="https:"||u.protocol==="http:";}catch{return false;}}
function validate(i:Input){if(!i.name?.trim()||!i.designation?.trim())return "Name and designation are required.";if((i.biography||"").length>2500||(i.tagline||"").length>180)return "Biography or tagline exceeds the allowed length.";if(!validUrl(i.image_url))return "Profile photograph must be a valid HTTP or HTTPS URL.";if(i.sort_order!==undefined&&(!Number.isInteger(Number(i.sort_order))||Number(i.sort_order)<0))return "Sort order must be a non-negative integer.";return null;}
export async function GET(){const {response}=await requireAdmin();if(response)return response;const rows=await queryNeon("select "+fields+" from public.team_members order by sort_order asc,created_at asc");return NextResponse.json(rows,{headers:{"Cache-Control":"private, no-store"}});}
export async function POST(request:NextRequest){
 const {actor,response}=await requireAdmin();if(response||!actor)return response;const input=await request.json() as Input,error=validate(input);if(error)return NextResponse.json({error},{status:400});
 const rows=await queryNeon("insert into public.team_members (id,name,designation,department,biography,tagline,image_url,sort_order,is_active,created_by,updated_by) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10) returning "+fields,[randomUUID(),input.name!.trim(),input.designation!.trim(),input.department?.trim()||"Editorial",input.biography||"",input.tagline?.trim()||null,input.image_url||null,Number(input.sort_order??100),input.is_active??true,actor.id]);
 return NextResponse.json(rows[0],{status:201});
}
