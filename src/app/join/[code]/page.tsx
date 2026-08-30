import type { Metadata } from "next";

import { JoinCoupleSession } from "@/features/couple/components/join-couple-session";

export const metadata: Metadata = {
  title: "Tham gia Couple Session",
  description: "Cùng người thương chọn quán phù hợp với cả hai.",
};

export const dynamic = "force-dynamic";

type JoinPageProps = { params: Promise<{ code: string }> };

export default async function JoinPage({ params }: JoinPageProps) {
  const { code } = await params;
  return <JoinCoupleSession code={code.trim().toUpperCase()} />;
}
