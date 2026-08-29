import { LogIn, LogOut, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { signInWithGoogle, signOut } from "@/features/auth/actions";
import { hasSupabaseEnv } from "@/lib/env/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const isConfigured = hasSupabaseEnv();
  const user = isConfigured
    ? (await (await createServerSupabaseClient()).auth.getUser()).data.user
    : null;

  return (
    <main className="px-5 pt-[max(2rem,env(safe-area-inset-top))]">
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Hồ sơ</p>
      <h1 className="mt-2 text-4xl font-black tracking-[-0.04em]">Gu của bạn</h1>

      <section className="mt-8 rounded-3xl border bg-card p-5">
        <span className="grid size-14 place-items-center rounded-2xl bg-secondary text-primary">
          <UserRound className="size-7" />
        </span>
        <p className="mt-4 font-extrabold">
          {user?.user_metadata.full_name ?? user?.email ?? "Đang dùng chế độ khách"}
        </p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          {user
            ? "Sở thích và danh sách đã lưu sẽ được đồng bộ với tài khoản này."
            : "Bạn có thể khám phá và tham gia couple session mà không cần đăng nhập."}
        </p>

        {user ? (
          <form action={signOut}>
            <Button className="mt-5" variant="outline" type="submit">
              <LogOut />
              Đăng xuất
            </Button>
          </form>
        ) : (
          <form action={signInWithGoogle}>
            <Button className="mt-5" type="submit" disabled={!isConfigured}>
              <LogIn />
              Đăng nhập với Google
            </Button>
            {!isConfigured && (
              <p className="mt-2 text-xs text-muted-foreground">
                Thêm biến môi trường Supabase để bật đăng nhập.
              </p>
            )}
          </form>
        )}
      </section>
    </main>
  );
}
