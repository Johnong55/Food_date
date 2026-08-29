import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type {
  MenuProvider,
  MenuProviderResult,
  MenuResolveContext,
} from "@/services/menu-resolver/menu-provider";
import type { MenuConfidence, MenuItem, MenuSourceType } from "@/types/menu";

const menuRowSchema = z.object({
  id: z.uuid(),
  source_type: z.enum([
    "application_database",
    "official_website",
    "merchant",
    "user_upload",
  ]),
  source_url: z.string().nullable(),
  verified: z.boolean(),
  last_updated: z.string().refine(
    (value) => Number.isFinite(Date.parse(value)),
    "Invalid menu timestamp",
  ),
});

const sectionRowSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1).max(120),
  sort_order: z.number().int(),
});

const itemRowSchema = z.object({
  id: z.uuid(),
  section_id: z.uuid(),
  name: z.string().min(1).max(200),
  description: z.string().nullable(),
  price: z.union([z.number(), z.string()]).nullable(),
  currency: z.string().length(3),
  image_url: z.string().nullable(),
  sort_order: z.number().int(),
});

const SOURCE_PRIORITY: Record<MenuSourceType, number> = {
  application_database: 0,
  merchant: 1,
  user_upload: 2,
  official_website: 3,
};

function confidenceForSource(source: MenuSourceType): MenuConfidence {
  if (source === "application_database" || source === "merchant") return "high";
  if (source === "user_upload") return "community";
  return "medium";
}

export class DatabaseMenuProvider implements MenuProvider {
  readonly id = "database";

  constructor(private readonly client: SupabaseClient) {}

  async resolve(context: MenuResolveContext): Promise<MenuProviderResult> {
    const menuQuery = await this.client
      .from("menus")
      .select("id,source_type,source_url,verified,last_updated")
      .eq("google_place_id", context.restaurantId)
      .eq("verified", true)
      .order("last_updated", { ascending: false })
      .limit(10);

    if (menuQuery.error) return { status: "failed", reason: "database_unavailable" };
    const menus = z.array(menuRowSchema).safeParse(menuQuery.data ?? []);
    if (!menus.success) return { status: "failed", reason: "invalid_database_menu" };

    const menu = [...menus.data].sort(
      (left, right) =>
        SOURCE_PRIORITY[left.source_type] - SOURCE_PRIORITY[right.source_type],
    )[0];
    if (!menu) return { status: "miss", reason: "not_found" };

    const sectionQuery = await this.client
      .from("menu_sections")
      .select("id,name,sort_order")
      .eq("menu_id", menu.id)
      .order("sort_order", { ascending: true })
      .limit(50);
    if (sectionQuery.error) return { status: "failed", reason: "database_unavailable" };

    const sections = z.array(sectionRowSchema).safeParse(sectionQuery.data ?? []);
    if (!sections.success) return { status: "failed", reason: "invalid_database_sections" };
    if (sections.data.length === 0) return { status: "miss", reason: "empty_menu" };

    const sectionIds = sections.data.map((section) => section.id);
    const itemQuery = await this.client
      .from("menu_items")
      .select("id,section_id,name,description,price,currency,image_url,sort_order")
      .in("section_id", sectionIds)
      .order("sort_order", { ascending: true })
      .limit(500);
    if (itemQuery.error) return { status: "failed", reason: "database_unavailable" };

    const items = z.array(itemRowSchema).safeParse(itemQuery.data ?? []);
    if (!items.success) return { status: "failed", reason: "invalid_database_items" };

    const normalizedItems = new Map<string, MenuItem[]>();
    for (const item of items.data) {
      const numericPrice = item.price === null ? undefined : Number(item.price);
      const normalized: MenuItem = {
        id: item.id,
        name: item.name,
        description: item.description ?? undefined,
        ...(numericPrice !== undefined && Number.isFinite(numericPrice)
          ? { price: numericPrice, currency: item.currency.toUpperCase() }
          : {}),
        imageUrl: item.image_url ?? undefined,
        sortOrder: item.sort_order,
      };
      normalizedItems.set(item.section_id, [
        ...(normalizedItems.get(item.section_id) ?? []),
        normalized,
      ]);
    }

    const normalizedSections = sections.data
      .map((section) => ({
        id: section.id,
        name: section.name,
        sortOrder: section.sort_order,
        items: normalizedItems.get(section.id) ?? [],
      }))
      .filter((section) => section.items.length > 0);

    if (normalizedSections.length === 0) {
      return { status: "miss", reason: "empty_menu" };
    }

    return {
      status: "resolved",
      menu: {
        restaurantId: context.restaurantId,
        sourceType: menu.source_type,
        sourceUrl: menu.source_url ?? undefined,
        verified: menu.verified,
        lastUpdated: new Date(menu.last_updated).toISOString(),
        confidence: confidenceForSource(menu.source_type),
        sections: normalizedSections,
      },
    };
  }
}
