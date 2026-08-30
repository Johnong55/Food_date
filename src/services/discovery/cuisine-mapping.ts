import type { SearchApiRequest } from "@/features/discovery/search-contract";
import type { PlaceSearchRequest } from "@/services/places/place-provider";

type SearchCuisine = SearchApiRequest["cuisines"][number];

type CuisineSearchConfig = {
  query: string;
  googleType?: string;
};

export const CUISINE_SEARCH_CONFIG: Record<SearchCuisine, CuisineSearchConfig> = {
  vietnamese: { query: "món Việt", googleType: "vietnamese_restaurant" },
  japanese: { query: "món Nhật", googleType: "japanese_restaurant" },
  korean: { query: "món Hàn", googleType: "korean_restaurant" },
  chinese: { query: "món Trung Hoa", googleType: "chinese_restaurant" },
  thai: { query: "món Thái", googleType: "thai_restaurant" },
  european: { query: "món Âu", googleType: "european_restaurant" },
  italian: { query: "món Ý", googleType: "italian_restaurant" },
  fast_food: { query: "đồ ăn nhanh", googleType: "fast_food_restaurant" },
  bbq: { query: "BBQ", googleType: "barbecue_restaurant" },
  seafood: { query: "hải sản", googleType: "seafood_restaurant" },
  hotpot: { query: "lẩu", googleType: "hot_pot_restaurant" },
  grilled: { query: "đồ nướng", googleType: "barbecue_restaurant" },
  rice: { query: "quán cơm" },
  noodles: { query: "bún phở", googleType: "noodle_shop" },
  healthy: { query: "đồ ăn healthy", googleType: "salad_shop" },
  vegetarian: { query: "món chay", googleType: "vegetarian_restaurant" },
  dessert: { query: "món tráng miệng", googleType: "dessert_shop" },
};

const MAX_SEARCH_RADIUS_METERS = 50_000;

export function buildPlaceSearchRequest(
  input: SearchApiRequest,
): PlaceSearchRequest {
  const cuisineConfigs = input.cuisines.map(
    (cuisine) => CUISINE_SEARCH_CONFIG[cuisine],
  );
  const singleGoogleType =
    cuisineConfigs.length === 1 ? cuisineConfigs[0]?.googleType : undefined;
  const textQuery = input.randomCuisine
    ? undefined
    : `nhà hàng ${cuisineConfigs.map((config) => config.query).join(" hoặc ")}`;

  return {
    center: input.location.coordinates,
    radiusMeters: input.radiusMeters ?? MAX_SEARCH_RADIUS_METERS,
    textQuery,
    includedTypes: input.randomCuisine
      ? ["restaurant"]
      : singleGoogleType
        ? [singleGoogleType]
        : undefined,
    pageSize: input.pageSize,
    languageCode: "vi",
    regionCode: "VN",
    includePhotos: true,
    includeOpenState: true,
    filters: {
      openNow: input.options.includes("open_now") || undefined,
      minRating: input.minRating,
      minReviewCount: input.minReviewCount,
      servesVegetarianFood:
        input.options.includes("vegetarian_friendly") || undefined,
    },
  };
}
