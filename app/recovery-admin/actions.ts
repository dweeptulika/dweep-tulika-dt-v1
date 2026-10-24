"use server";

import { timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

const TARGET_USER_ID = "eb592a0a-96dc-4d08-b815-74a96fc4d69f";

function matchesSecret(input: string, expected: string) {
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function setNewsroomPassword(formData: FormData) {
  const suppliedSecret = String(formData.get("recoverySecret") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");

  const expectedSecret = process.env.NEWSROOM_RECOVERY_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!expectedSecret || !supabaseUrl || !serviceKey) {
    redirect("/recovery-admin?status=not_configured");
  }
  if (!matchesSecret(suppliedSecret, expectedSecret)) {
    redirect("/recovery-admin?status=unauthorized");
  }
  if (password.length < 12 || password.length > 128 || password !== confirmation) {
    redirect("/recovery-admin?status=invalid_password");
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await supabase.auth.admin.updateUserById(TARGET_USER_ID, { password });
  if (error) {
    redirect("/recovery-admin?status=failed");
  }

  redirect("/recovery-admin?status=success");
}
