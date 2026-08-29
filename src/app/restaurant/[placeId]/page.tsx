import type { Metadata } from "next";

import { RestaurantDetail } from "@/features/restaurant/components/restaurant-detail";

export const metadata: Metadata = {
  title: "Chi tiết quán",
  description: "Xem thông tin, giờ mở cửa và đánh giá của địa điểm.",
};

export const dynamic = "force-dynamic";

type RestaurantDetailPageProps = {
  params: Promise<{ placeId: string }>;
};

export default async function RestaurantDetailPage({
  params,
}: RestaurantDetailPageProps) {
  const { placeId } = await params;
  return <RestaurantDetail key={placeId} placeId={placeId} />;
}
