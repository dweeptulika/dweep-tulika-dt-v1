import { NextRequest,NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/authorization";
import { queryNeon } from "@/lib/backend/neon";
type Input={name?:string;designation?:string;department?:string;biography?:string;tagline?:string|null;image_url?:string|null;sort_order?:number;is_active?:boolean};
const fields="id,name,designation,department,biography,tagline,image_url,sort_order,is_active,created_at,updated_at";
function validUrl(v?:string|null){if(!v)return true;try{const u=new URL(v);return u.protocol==="https:"||u.protocol==="http:";}catch{return false;}}
export async function PATCH(request:NextRequest,context:{params:Promise<{id:string}>}){
 const {actor,response}=await requireAdmin();if(response||!actor)return response;const {id}=await context.params,input=await request.json() as Input;
 if(!input.name?.trim()||!input.designation?.trim())return NextResponse.json({error:"Name and designation are required."},{status:400});
 if((input.biography||"").length>2500||(input.tagline||"").length>180||!validUrl(input.image_url))return NextResponse.json({error:"Biography, tagline or image URL is invalid."},{status:400});
 const order=Number(input.sort_order??100);if(!Number.isInteger(order)||order<0)return NextResponse.json({error:"Sort order must be a non-negative integer."},{status:400});
 const rows=await queryNeon("update public.team_members set name=$2,designation=$3,department=$4,biography=$5,tagline=$6,image_url=$7,sort_order=$8,is_active=$9,updated_by=$10,updated_at=now() where id=$1 returning "+fields,[id,input.name.trim(),input.designation.trim(),input.department?.trim()||"Editorial",input.biography||"",input.tagline?.trim()||null,input.image_url||null,order,input.is_active??true,actor.id]);
 if(!rows[0])return NextResponse.json({error:"Team member not found."},{status:404});return NextResponse.json(rows[0]);
}
export async function DELETE(_request:NextRequest,context:{params:Promise<{id:string}>}){
 const {response}=await requireAdmin();if(response)return response;const {id}=await context.params;
 const rows=await queryNeon("delete from public.team_members where id=$1 returning id",[id]);if(!rows[0])return NextResponse.json({error:"Team member not found."},{status:404});return NextResponse.json({ok:true});
}
