import { Heart, LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import { signInWithGoogle } from "@/features/auth/actions";

export function OwnedDataAuthState({
  title,
  description,
  next,
  configured,
}: {
  title: string;
  description: string;
  next: string;
  configured: boolean;
}) {
  return (
    <main className="grid min-h-[calc(100svh-5rem)] place-items-center px-5 text-center">
      <section className="max-w-sm">
        <span className="mx-auto grid size-20 place-items-center rounded-[1.75rem] bg-rose-100 text-rose-600">
          <Heart className="size-8" />
        </span>
        <h1 className="mt-5 text-3xl font-black tracking-[-0.04em]">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
        <form action={signInWithGoogle} className="mt-6">
          <input type="hidden" name="next" value={next} />
          <Button type="submit" size="lg" className="w-full" disabled={!configured}>
            <LogIn /> Đăng nhập với Google
          </Button>
        </form>
        {!configured && (
          <p className="mt-3 text-xs text-muted-foreground">
            Cần cấu hình Supabase Auth để bật đồng bộ.
          </p>
        )}
      </section>
    </main>
  );
}
