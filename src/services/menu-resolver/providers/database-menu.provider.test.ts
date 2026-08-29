import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { DatabaseMenuProvider } from "@/services/menu-resolver/providers/database-menu.provider";

type QueryResult = { data: unknown[]; error: null };

class FakeQuery implements PromiseLike<QueryResult> {
  constructor(private readonly result: QueryResult) {}
  select() {
    return this;
  }
  eq() {
    return this;
  }
  in() {
    return this;
  }
  order() {
    return this;
  }
  limit() {
    return this;
  }
  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.result).then(onfulfilled, onrejected);
  }
}

function fakeClient(results: Record<string, QueryResult>) {
  return {
    from(table: string) {
      return new FakeQuery(results[table] ?? { data: [], error: null });
    },
  } as unknown as SupabaseClient;
}

describe("DatabaseMenuProvider", () => {
  it("returns a normalized verified menu with bounded relational reads", async () => {
    const provider = new DatabaseMenuProvider(
      fakeClient({
        menus: {
          data: [
            {
              id: "11111111-1111-4111-8111-111111111111",
              source_type: "merchant",
              source_url: null,
              verified: true,
              last_updated: "2026-08-29T10:00:00.000Z",
            },
          ],
          error: null,
        },
        menu_sections: {
          data: [
            {
              id: "22222222-2222-4222-8222-222222222222",
              name: "Ramen",
              sort_order: 0,
            },
          ],
          error: null,
        },
        menu_items: {
          data: [
            {
              id: "33333333-3333-4333-8333-333333333333",
              section_id: "22222222-2222-4222-8222-222222222222",
              name: "Tonkotsu",
              description: null,
              price: "129000.00",
              currency: "VND",
              image_url: null,
              sort_order: 0,
            },
          ],
          error: null,
        },
      }),
    );

    await expect(provider.resolve({ restaurantId: "place-1" })).resolves.toMatchObject({
      status: "resolved",
      menu: {
        restaurantId: "place-1",
        sourceType: "merchant",
        verified: true,
        sections: [
          {
            name: "Ramen",
            items: [{ name: "Tonkotsu", price: 129_000, currency: "VND" }],
          },
        ],
      },
    });
  });

  it("returns a miss when the verified database has no menu", async () => {
    const provider = new DatabaseMenuProvider(fakeClient({}));
    await expect(provider.resolve({ restaurantId: "place-1" })).resolves.toEqual({
      status: "miss",
      reason: "not_found",
    });
  });
});
