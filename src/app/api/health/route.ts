import { NextResponse } from "next/server";

import { hasGooglePlacesEnv, hasSupabaseEnv } from "@/lib/env/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    {
      status: "ok",
      services: {
        supabaseConfigured: hasSupabaseEnv(),
        placesConfigured: hasGooglePlacesEnv(),
      },
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
