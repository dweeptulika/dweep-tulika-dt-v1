"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LogoutPage() {
  const router = useRouter();
  useEffect(() => {
    createClient().auth.signOut().finally(() => router.replace("/admin/login"));
  }, [router]);
  return <main className="adminLogin"><p>Signing out…</p></main>;
}
