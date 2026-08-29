import "server-only";

import { hasSupabaseEnv } from "@/lib/env/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { MenuResolver } from "@/services/menu-resolver/menu-resolver";
import { DatabaseMenuProvider } from "@/services/menu-resolver/providers/database-menu.provider";
import { OfficialWebsiteMenuProvider } from "@/services/menu-resolver/providers/official-website-menu.provider";
import type { MenuResolution } from "@/types/menu";

export async function resolveStoredMenu(
  restaurantId: string,
): Promise<MenuResolution> {
  if (!hasSupabaseEnv()) {
    return {
      status: "unavailable",
      attempts: [
        {
          provider: "database",
          status: "miss",
          reason: "database_not_configured",
        },
      ],
    };
  }

  const client = await createServerSupabaseClient();
  return new MenuResolver([new DatabaseMenuProvider(client)]).resolve({
    restaurantId,
  });
}

export async function resolveOfficialWebsiteMenu(
  restaurantId: string,
  officialWebsiteUri: string,
): Promise<MenuResolution> {
  return new MenuResolver([new OfficialWebsiteMenuProvider()]).resolve({
    restaurantId,
    officialWebsiteUri,
  });
}
