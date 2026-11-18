import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { queryNeon } from "@/lib/backend/neon";

export type EditorialActor = {
  id: string;
  display_name: string;
  role: "admin" | "editor";
  auth_user_id: string;
  email: string;
};

export async function requireEditor() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      actor: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  // Editorial profile IDs were retained from Supabase during the Neon data
  // migration. Use the original Supabase user ID to preserve existing roles.
  const rows = await queryNeon<{
    id: string;
    display_name: string;
    role: "admin" | "editor";
  }>(
    "select id, display_name, role from public.editorial_profiles where id=$1 limit 1",
    [user.id],
  );
  const profile = rows[0];

  if (!profile || !["admin", "editor"].includes(profile.role)) {
    return {
      actor: null,
      response: NextResponse.json(
        { error: "This Supabase account is not linked to an authorised newsroom profile." },
        { status: 403 },
      ),
    };
  }

  return {
    actor: {
      ...profile,
      auth_user_id: user.id,
      email: user.email ?? "",
    },
    response: null,
  };
}

export async function requireAdmin() {
  const result = await requireEditor();
  if (result.response) return result;
  if (result.actor?.role !== "admin") {
    return {
      actor: null,
      response: NextResponse.json({ error: "Administrator access required." }, { status: 403 }),
    };
  }
  return result;
}
