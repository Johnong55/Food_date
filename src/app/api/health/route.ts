import { NextResponse } from "next/server";

import {
  hasGooglePlacesEnv,
  hasSupabaseAdminEnv,
  hasSupabaseEnv,
} from "@/lib/env/server";

export const dynamic = "force-dynamic";

export function GET() {
  const services = {
    supabaseConfigured: hasSupabaseEnv(),
    supabaseAdminConfigured: hasSupabaseAdminEnv(),
    placesConfigured: hasGooglePlacesEnv(),
  };
  const ready = Object.values(services).every(Boolean);

  return NextResponse.json(
    {
      status: ready ? "ok" : "degraded",
      ready,
      services,
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? "local",
      timestamp: new Date().toISOString(),
    },
    {
      status: ready || process.env.NODE_ENV !== "production" ? 200 : 503,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
