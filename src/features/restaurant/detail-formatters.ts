import type { Money, PlaceDetails, PlaceFeatures } from "@/types/place";

const FEATURE_LABELS: Array<{
  key: keyof PlaceFeatures;
  label: string;
  emoji: string;
}> = [
  { key: "dineIn", label: "Có chỗ ngồi", emoji: "🪑" },
  { key: "takeout", label: "Mang đi", emoji: "🥡" },
  { key: "delivery", label: "Giao hàng", emoji: "🛵" },
  { key: "reservable", label: "Có đặt bàn", emoji: "📅" },
  { key: "outdoorSeating", label: "Outdoor", emoji: "🌿" },
  { key: "goodForGroups", label: "Phù hợp nhóm", emoji: "👥" },
  { key: "goodForChildren", label: "Phù hợp trẻ em", emoji: "🧸" },
  { key: "liveMusic", label: "Nhạc sống", emoji: "🎵" },
  { key: "servesBreakfast", label: "Bữa sáng", emoji: "🍳" },
  { key: "servesLunch", label: "Bữa trưa", emoji: "🍚" },
  { key: "servesDinner", label: "Bữa tối", emoji: "🌙" },
  { key: "servesCoffee", label: "Có coffee", emoji: "☕" },
  { key: "servesDessert", label: "Có dessert", emoji: "🍰" },
  { key: "servesCocktails", label: "Có cocktail", emoji: "🍸" },
  { key: "servesVegetarianFood", label: "Có món chay", emoji: "🌱" },
];

export function formatMoney(money?: Money) {
  if (!money) return undefined;
  const units = Number(money.units ?? 0);
  const nanos = money.nanos ?? 0;
  const amount = units + nanos / 1_000_000_000;
  if (!Number.isFinite(amount) || !/^[A-Z]{3}$/.test(money.currencyCode)) {
    return undefined;
  }

  try {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: money.currencyCode,
      maximumFractionDigits: money.currencyCode === "VND" ? 0 : 2,
    }).format(amount);
  } catch {
    return undefined;
  }
}

export function formatVerifiedPriceRange(place: PlaceDetails) {
  const start = formatMoney(place.priceRange?.startPrice);
  const end = formatMoney(place.priceRange?.endPrice);
  if (start && end) return `${start} – ${end}`;
  if (start) return `Từ ${start}`;
  if (end) return `Tối đa ${end}`;
  return undefined;
}

export function getAvailableFeatureLabels(features: PlaceFeatures) {
  const labels = FEATURE_LABELS.filter(({ key }) => features[key] === true);
  if (Object.values(features.parkingOptions ?? {}).some((available) => available === true)) {
    labels.push({ key: "parkingOptions", label: "Có parking", emoji: "🅿️" });
  }
  return labels;
}

export function buildGoogleMapsDirectionsUrl(place: PlaceDetails) {
  const url = new URL("https://www.google.com/maps/dir/");
  url.searchParams.set("api", "1");
  url.searchParams.set(
    "destination",
    `${place.location.latitude},${place.location.longitude}`,
  );
  url.searchParams.set("destination_place_id", place.id);
  url.searchParams.set("travelmode", "driving");
  return url.toString();
}
