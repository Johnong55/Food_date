import type {
  BudgetId,
  CuisineId,
  DistanceId,
  MoodId,
  PreferenceOptionId,
  ReviewThreshold,
  UserLocation,
} from "@/features/discovery/types";

export const CUISINE_OPTIONS = [
  { id: "vietnamese", label: "Việt Nam", emoji: "🇻🇳" },
  { id: "japanese", label: "Nhật", emoji: "🍣" },
  { id: "korean", label: "Hàn", emoji: "🥘" },
  { id: "chinese", label: "Trung", emoji: "🥟" },
  { id: "thai", label: "Thái", emoji: "🌶️" },
  { id: "european", label: "Âu", emoji: "🍽️" },
  { id: "italian", label: "Ý", emoji: "🍝" },
  { id: "fast_food", label: "Fast Food", emoji: "🍔" },
  { id: "bbq", label: "BBQ", emoji: "🥩" },
  { id: "seafood", label: "Hải sản", emoji: "🦐" },
  { id: "hotpot", label: "Lẩu", emoji: "🍲" },
  { id: "grilled", label: "Nướng", emoji: "🔥" },
  { id: "rice", label: "Cơm", emoji: "🍚" },
  { id: "noodles", label: "Bún / Phở", emoji: "🍜" },
  { id: "healthy", label: "Healthy", emoji: "🥗" },
  { id: "vegetarian", label: "Vegetarian", emoji: "🌱" },
  { id: "dessert", label: "Dessert", emoji: "🍰" },
  { id: "random", label: "Random", emoji: "🎲" },
] as const satisfies ReadonlyArray<{
  id: CuisineId;
  label: string;
  emoji: string;
}>;

export const MOOD_OPTIONS = [
  { id: "quick", label: "Ăn nhanh", emoji: "⚡" },
  { id: "chill", label: "Chill", emoji: "😌" },
  { id: "fancy", label: "Sang", emoji: "✨" },
  { id: "cheap", label: "Rẻ", emoji: "🪙" },
  { id: "filling", label: "No căng", emoji: "😋" },
  { id: "healthy", label: "Healthy", emoji: "🥗" },
  { id: "romantic", label: "Romantic", emoji: "🌹" },
  { id: "nice_view", label: "View đẹp", emoji: "🌇" },
  { id: "quiet", label: "Yên tĩnh", emoji: "🤫" },
  { id: "lively", label: "Đông vui", emoji: "🎉" },
  { id: "air_conditioned", label: "Có máy lạnh", emoji: "❄️" },
  { id: "outdoor", label: "Outdoor", emoji: "🌿" },
  { id: "date_night", label: "Date night", emoji: "❤️" },
] as const satisfies ReadonlyArray<{
  id: MoodId;
  label: string;
  emoji: string;
}>;

export const BUDGET_OPTIONS = [
  { id: "under_100", label: "Dưới 100k", detail: "nhanh và tiết kiệm", min: 0, max: 100_000 },
  { id: "100_200", label: "100–200k", detail: "dễ chọn mỗi ngày", min: 100_000, max: 200_000 },
  { id: "200_400", label: "200–400k", detail: "một buổi hẹn đẹp", min: 200_000, max: 400_000 },
  { id: "400_700", label: "400–700k", detail: "thưởng thức chỉn chu", min: 400_000, max: 700_000 },
  { id: "over_700", label: "Trên 700k", detail: "một dịp đặc biệt", min: 700_000, max: null },
] as const satisfies ReadonlyArray<{
  id: BudgetId;
  label: string;
  detail: string;
  min: number;
  max: number | null;
}>;

export const DISTANCE_OPTIONS = [
  { id: "1km", label: "< 1 km", radiusMeters: 1_000 },
  { id: "3km", label: "< 3 km", radiusMeters: 3_000 },
  { id: "5km", label: "< 5 km", radiusMeters: 5_000 },
  { id: "10km", label: "< 10 km", radiusMeters: 10_000 },
  { id: "any", label: "Không quan trọng", radiusMeters: null },
] as const satisfies ReadonlyArray<{
  id: DistanceId;
  label: string;
  radiusMeters: number | null;
}>;

export const RATING_OPTIONS = [3.5, 4, 4.3, 4.5] as const;

export const REVIEW_OPTIONS = [20, 50, 100, 500, 1000] as const satisfies readonly ReviewThreshold[];

export const PREFERENCE_OPTIONS = [
  { id: "open_now", label: "Đang mở cửa", emoji: "🟢", support: "google" },
  { id: "has_seating", label: "Có chỗ ngồi", emoji: "🪑", support: "best_effort" },
  { id: "outdoor_seating", label: "Outdoor", emoji: "🌿", support: "google" },
  { id: "parking", label: "Có parking", emoji: "🅿️", support: "best_effort" },
  { id: "vegetarian_friendly", label: "Vegetarian friendly", emoji: "🌱", support: "google" },
  { id: "serves_dessert", label: "Có dessert", emoji: "🍰", support: "google" },
  { id: "serves_coffee", label: "Có coffee", emoji: "☕", support: "google" },
  { id: "serves_cocktails", label: "Có cocktail", emoji: "🍸", support: "best_effort" },
  { id: "good_for_groups", label: "Phù hợp nhóm", emoji: "👥", support: "google" },
  { id: "reservable", label: "Có đặt bàn", emoji: "📅", support: "google" },
] as const satisfies ReadonlyArray<{
  id: PreferenceOptionId;
  label: string;
  emoji: string;
  support: "google" | "best_effort";
}>;

export const HO_CHI_MINH_AREAS = [
  { id: "district-1", label: "Quận 1", coordinates: { latitude: 10.7756, longitude: 106.7004 } },
  { id: "district-3", label: "Quận 3", coordinates: { latitude: 10.7844, longitude: 106.6844 } },
  { id: "district-4", label: "Quận 4", coordinates: { latitude: 10.7578, longitude: 106.7013 } },
  { id: "district-5", label: "Quận 5", coordinates: { latitude: 10.754, longitude: 106.6634 } },
  { id: "district-7", label: "Quận 7", coordinates: { latitude: 10.734, longitude: 106.7216 } },
  { id: "district-10", label: "Quận 10", coordinates: { latitude: 10.7746, longitude: 106.6677 } },
  { id: "district-11", label: "Quận 11", coordinates: { latitude: 10.7659, longitude: 106.6478 } },
  { id: "binh-thanh", label: "Bình Thạnh", coordinates: { latitude: 10.8117, longitude: 106.7091 } },
  { id: "phu-nhuan", label: "Phú Nhuận", coordinates: { latitude: 10.7992, longitude: 106.6803 } },
  { id: "tan-binh", label: "Tân Bình", coordinates: { latitude: 10.8015, longitude: 106.6526 } },
  { id: "go-vap", label: "Gò Vấp", coordinates: { latitude: 10.8387, longitude: 106.6653 } },
  { id: "thu-duc", label: "TP. Thủ Đức", coordinates: { latitude: 10.8494, longitude: 106.7537 } },
] as const satisfies readonly UserLocation[];

export function findOptionLabel<T extends string>(
  options: ReadonlyArray<{ id: T; label: string }>,
  id: T,
) {
  return options.find((option) => option.id === id)?.label ?? id;
}
