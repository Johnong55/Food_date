import type { ResolvedMenu } from "@/types/menu";

export type MenuResolveContext = {
  restaurantId: string;
  officialWebsiteUri?: string;
};

export type MenuProviderResult =
  | { status: "resolved"; menu: ResolvedMenu }
  | { status: "miss"; reason?: string }
  | { status: "blocked"; reason: string }
  | { status: "failed"; reason: string };

export interface MenuProvider {
  readonly id: string;
  resolve(context: MenuResolveContext): Promise<MenuProviderResult>;
}
