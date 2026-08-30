import type { Metadata } from "next";

import { HistoryDashboard } from "@/features/saved/components/history-dashboard";
import { OwnedDataAuthState } from "@/features/saved/components/owned-data-auth-state";
import { hasSupabaseEnv } from "@/lib/env/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Những nơi đã đi",
  description: "Timeline quán đã ghé, đánh giá cá nhân và chi phí ước tính.",
};

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const configured = hasSupabaseEnv();
  const user = configured
    ? (await (await createServerSupabaseClient()).auth.getUser()).data.user
    : null;

  if (!user) {
    return (
      <OwnedDataAuthState
        configured={configured}
        next="/history"
        title="Những nơi mình đã đi"
        description="Đăng nhập để lưu timeline, đánh giá riêng, ghi chú và chi phí của mỗi lần ghé."
      />
    );
  }

  return <HistoryDashboard />;
}
