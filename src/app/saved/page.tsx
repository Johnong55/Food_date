import type { Metadata } from "next";

import { SavedDashboard } from "@/features/saved/components/saved-dashboard";
import { OwnedDataAuthState } from "@/features/saved/components/owned-data-auth-state";
import { hasSupabaseEnv } from "@/lib/env/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Đã lưu",
  description: "Collection các quán muốn thử cho những buổi hẹn tiếp theo.",
};

export const dynamic = "force-dynamic";

export default async function SavedPage() {
  const configured = hasSupabaseEnv();
  const user = configured
    ? (await (await createServerSupabaseClient()).auth.getUser()).data.user
    : null;

  if (!user) {
    return (
      <OwnedDataAuthState
        configured={configured}
        next="/saved"
        title="Giữ lại những nơi muốn thử"
        description="Đăng nhập để đồng bộ collection giữa điện thoại và trình duyệt. Tìm quán và Couple Mode vẫn dùng được khi chưa đăng nhập."
      />
    );
  }

  return <SavedDashboard />;
}
