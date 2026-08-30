import type { Metadata } from "next";

import { CoupleLobby } from "@/features/couple/components/couple-lobby";

export const metadata: Metadata = {
  title: "Couple Mode",
  description: "Tạo phiên riêng và tìm sở thích ăn uống phù hợp với cả hai.",
};

export default function MatchesPage() {
  return <CoupleLobby />;
}
