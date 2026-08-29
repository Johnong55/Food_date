import { formatMoney } from "@/features/restaurant/detail-formatters";
import { formatPriceLevel } from "@/features/restaurant/place-formatters";
import type { ResolvedMenu } from "@/types/menu";
import type { MenuPlaceContext } from "@/types/menu";

const SOURCE_LABELS: Record<ResolvedMenu["sourceType"], string> = {
  application_database: "Dữ liệu của Đi Đâu Ăn Gì?",
  official_website: "Website chính thức",
  merchant: "Nhà hàng xác minh",
  user_upload: "Cộng đồng đóng góp",
};

export function formatMenuSource(menu: ResolvedMenu) {
  return SOURCE_LABELS[menu.sourceType];
}

export function formatMenuUpdatedAt(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Chưa rõ";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatMenuItemPrice(price?: number, currency = "VND") {
  if (price === undefined || !Number.isFinite(price) || price < 0) {
    return "Liên hệ quán";
  }
  try {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency,
      maximumFractionDigits: currency === "VND" ? 0 : 2,
    }).format(price);
  } catch {
    return `${price.toLocaleString("vi-VN")} ${currency}`;
  }
}

export function formatMenuFallbackPrice(place?: MenuPlaceContext) {
  const start = formatMoney(place?.priceRange?.startPrice);
  const end = formatMoney(place?.priceRange?.endPrice);
  if (start && end) return `${start} – ${end}`;
  if (start) return `Từ ${start}`;
  if (end) return `Tối đa ${end}`;
  return place?.priceLevel ? formatPriceLevel(place.priceLevel) : undefined;
}

export function estimateMenuForTwo(menu: ResolvedMenu) {
  if (!menu.verified || menu.confidence === "community") return undefined;

  const items = menu.sections.flatMap((section) => section.items);
  const prices = items
    .filter((item) => (item.currency ?? "VND") === "VND")
    .map((item) => item.price)
    .filter((price): price is number => price !== undefined && price > 0)
    .sort((left, right) => left - right);

  if (items.length < 8 || prices.length / items.length < 0.8) return undefined;
  const lowerItem = prices[Math.floor((prices.length - 1) * 0.25)];
  const upperItem = prices[Math.ceil((prices.length - 1) * 0.75)];
  if (lowerItem === undefined || upperItem === undefined) return undefined;

  const roundToTenThousand = (value: number) =>
    Math.max(10_000, Math.round(value / 10_000) * 10_000);
  return {
    minimum: roundToTenThousand(lowerItem * 2),
    maximum: roundToTenThousand(upperItem * 2),
    currency: "VND" as const,
  };
}
