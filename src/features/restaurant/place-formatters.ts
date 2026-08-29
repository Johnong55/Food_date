import type { PlacePriceLevel, PlaceSummary } from "@/types/place";

const TYPE_LABELS: Record<string, string> = {
  restaurant: "Nhà hàng",
  food: "Ẩm thực",
  vietnamese_restaurant: "Món Việt",
  japanese_restaurant: "Món Nhật",
  korean_restaurant: "Món Hàn",
  chinese_restaurant: "Món Trung",
  thai_restaurant: "Món Thái",
  italian_restaurant: "Món Ý",
  european_restaurant: "Món Âu",
  fast_food_restaurant: "Fast food",
  barbecue_restaurant: "BBQ",
  seafood_restaurant: "Hải sản",
  ramen_restaurant: "Ramen",
  sushi_restaurant: "Sushi",
  noodle_shop: "Bún / mì",
  vegetarian_restaurant: "Món chay",
  dessert_shop: "Dessert",
  cafe: "Cafe",
  coffee_shop: "Coffee",
};

const PRICE_LABELS: Record<PlacePriceLevel, string> = {
  PRICE_LEVEL_FREE: "Miễn phí",
  PRICE_LEVEL_INEXPENSIVE: "₫",
  PRICE_LEVEL_MODERATE: "₫₫",
  PRICE_LEVEL_EXPENSIVE: "₫₫₫",
  PRICE_LEVEL_VERY_EXPENSIVE: "₫₫₫₫",
};

export function formatReviewCount(value?: number) {
  if (value === undefined) return "Chưa có đánh giá";
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}M đánh giá`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}K đánh giá`;
  }
  return `${value.toLocaleString("vi-VN")} đánh giá`;
}

export function formatDistance(distanceMeters?: number) {
  if (distanceMeters === undefined) return "Chưa rõ khoảng cách";
  if (distanceMeters < 1_000) return `${distanceMeters.toLocaleString("vi-VN")} m`;
  return `${(distanceMeters / 1_000).toLocaleString("vi-VN", {
    maximumFractionDigits: 1,
  })} km`;
}

export function formatPriceLevel(priceLevel?: PlacePriceLevel) {
  return priceLevel ? PRICE_LABELS[priceLevel] : "Chưa có mức giá";
}

export function formatPlaceType(type: string) {
  return (
    TYPE_LABELS[type] ??
    type
      .replace(/_restaurant$/, "")
      .replaceAll("_", " ")
      .replace(/^./, (character) => character.toLocaleUpperCase("vi-VN"))
  );
}

export function getPlaceTags(place: PlaceSummary) {
  const ignored = new Set(["restaurant", "food", "point_of_interest", "establishment"]);
  return [place.primaryType, ...place.types]
    .filter((type): type is string => Boolean(type) && !ignored.has(type as string))
    .filter((type, index, types) => types.indexOf(type) === index)
    .slice(0, 3)
    .map(formatPlaceType);
}

export function buildGoogleMapsUrl(place: PlaceSummary) {
  const url = new URL("https://www.google.com/maps/search/");
  url.searchParams.set("api", "1");
  url.searchParams.set(
    "query",
    place.formattedAddress ??
      `${place.location.latitude},${place.location.longitude}`,
  );
  url.searchParams.set("query_place_id", place.id);
  return url.toString();
}

export function safeExternalUrl(value?: string) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}
