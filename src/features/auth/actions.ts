"use server";

import type { Route } from "next";
import { redirect } from "next/navigation";

import { getSiteUrl } from "@/lib/env/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function safeNextPath(value: FormDataEntryValue | null | undefined) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/profile";
}

export async function signInWithGoogle(formData?: FormData) {
  const next = safeNextPath(formData?.get("next"));
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${getSiteUrl()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error || !data.url) {
    redirect("/auth/auth-code-error");
  }

  // Next typedRoutes models app-internal routes; Supabase returns a validated
  // external OAuth URL, while redirect() itself supports absolute URLs.
  redirect(data.url as Route);
}

export async function signOut() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/");
}
