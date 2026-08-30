import type { Metadata } from "next";

import { CoupleRoom } from "@/features/couple/components/couple-room";

export const metadata: Metadata = {
  title: "Couple Session",
  description: "Chọn sở thích riêng và tìm phần phù hợp cho cả hai.",
};

export const dynamic = "force-dynamic";

type CoupleRoomPageProps = { params: Promise<{ code: string }> };

export default async function CoupleRoomPage({ params }: CoupleRoomPageProps) {
  const { code } = await params;
  return <CoupleRoom code={code.trim().toUpperCase()} />;
}
