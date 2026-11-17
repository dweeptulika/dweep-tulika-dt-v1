"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";
export default function LogoutPage(){const router=useRouter();useEffect(()=>{authClient.signOut().finally(()=>{router.replace("/admin/login");router.refresh();});},[router]);return <main className="adminLogin"><p>Signing out…</p></main>;}
