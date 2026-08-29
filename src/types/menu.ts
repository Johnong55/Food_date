import type { PlacePriceLevel, PriceRange } from "@/types/place";

export type MenuSourceType =
  | "application_database"
  | "official_website"
  | "merchant"
  | "user_upload";

export type MenuConfidence = "high" | "medium" | "community";

export type MenuItem = {
  id: string;
  name: string;
  description?: string;
  price?: number;
  currency?: string;
  imageUrl?: string;
  sortOrder: number;
};

export type MenuSection = {
  id: string;
  name: string;
  sortOrder: number;
  items: MenuItem[];
};

export type ResolvedMenu = {
  restaurantId: string;
  sourceType: MenuSourceType;
  sourceUrl?: string;
  verified: boolean;
  lastUpdated: string;
  confidence: MenuConfidence;
  sections: MenuSection[];
};

export type MenuProviderAttempt = {
  provider: string;
  status: "resolved" | "miss" | "blocked" | "failed";
  reason?: string;
};

export type MenuResolution =
  | {
      status: "resolved";
      menu: ResolvedMenu;
      attempts: MenuProviderAttempt[];
    }
  | {
      status: "unavailable";
      attempts: MenuProviderAttempt[];
    };

export type MenuPlaceContext = {
  displayName: string;
  websiteUri?: string;
  googleMapsUri?: string;
  priceLevel?: PlacePriceLevel;
  priceRange?: PriceRange;
};

export type MenuApiData = {
  resolution: MenuResolution;
  place?: MenuPlaceContext;
  canResolveOfficialWebsite: boolean;
};
