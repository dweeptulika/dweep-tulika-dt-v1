import "server-only";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { queryNeon } from "@/lib/backend/neon";
export type EditorialActor = { id:string; display_name:string; role:"admin"|"editor"; auth_user_id:string; email:string };
export async function requireEditor() {
  const { data } = await auth.getSession();
  const user = data?.user;
  if (!user) return { actor:null, response:NextResponse.json({error:"Unauthorized"},{status:401}) };
  const rows = await queryNeon<EditorialActor>(
    "select id,display_name,role,auth_user_id from public.editorial_profiles where auth_user_id=$1 limit 1",
    [user.id],
  );
  const actor = rows[0];
  if (!actor || !["admin","editor"].includes(actor.role)) return {
    actor:null,
    response:NextResponse.json({error:"This Neon Auth account has not been linked to an authorised newsroom profile."},{status:403}),
  };
  return { actor:{...actor,email:user.email}, response:null };
}
export async function requireAdmin() {
  const result=await requireEditor();
  if(result.response)return result;
  if(result.actor?.role!=="admin")return {actor:null,response:NextResponse.json({error:"Administrator access required."},{status:403})};
  return result;
}
