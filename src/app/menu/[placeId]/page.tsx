import type { Metadata } from "next";

import { MenuPage } from "@/features/menu/components/menu-page";

export const metadata: Metadata = {
  title: "Menu quán",
  description: "Xem thực đơn, giá và nguồn cập nhật của nhà hàng.",
};

export const dynamic = "force-dynamic";

type MenuRoutePageProps = {
  params: Promise<{ placeId: string }>;
};

export default async function MenuRoutePage({ params }: MenuRoutePageProps) {
  const { placeId } = await params;
  return <MenuPage key={placeId} placeId={placeId} />;
}
