"use client";

import type { Route } from "next";
import { ArrowRight, HeartHandshake, LoaderCircle, UsersRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createCoupleSession } from "@/features/couple/api/couple-session";

export function CoupleLobby() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string>();

  const createSession = async () => {
    const name = displayName.trim();
    if (!name) {
      setError("Hãy nhập tên để người ấy nhận ra bạn.");
      return;
    }
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12_000);
    setCreating(true);
    setError(undefined);
    try {
      const session = await createCoupleSession(name, controller.signal);
      router.push(`/couple/${session.code}` as Route);
    } catch (requestError) {
      setError(
        requestError instanceof Error && requestError.name !== "AbortError"
          ? requestError.message
          : "Tạo phiên hơi lâu. Hãy thử lại nhé.",
      );
    } finally {
      window.clearTimeout(timeout);
      setCreating(false);
    }
  };

  const openJoinPage = () => {
    const code = joinCode.trim().toUpperCase();
    if (!/^[A-Z0-9]{6,10}$/.test(code)) {
      setError("Mã phiên gồm 6–10 chữ hoặc số.");
      return;
    }
    router.push(`/join/${code}` as Route);
  };

  return (
    <main className="px-4 pb-8 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <header className="text-center">
        <span className="mx-auto grid size-20 place-items-center rounded-[1.75rem] bg-rose-100 text-rose-600">
          <HeartHandshake className="size-9" />
        </span>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-primary">
          Couple mode
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.04em]">
          Hai gu, một lựa chọn ❤️
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
          Mỗi người chọn riêng. App chỉ tiết lộ phần cả hai cùng hợp.
        </p>
      </header>

      <Card className="mt-7 border-primary/15">
        <CardContent>
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-secondary">
              <UsersRound className="size-5 text-primary" />
            </span>
            <div>
              <h2 className="font-black">Tạo phiên mới</h2>
              <p className="text-xs text-muted-foreground">Link hết hạn sau 24 giờ.</p>
            </div>
          </div>
          <label className="mt-5 block">
            <span className="text-xs font-bold">Tên của bạn</span>
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value.slice(0, 40))}
              placeholder="Ví dụ: John"
              autoComplete="nickname"
              className="mt-2 min-h-12 w-full rounded-2xl border border-input bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
          <Button
            className="mt-4 w-full"
            size="lg"
            onClick={() => void createSession()}
            disabled={creating}
          >
            {creating ? <LoaderCircle className="animate-spin" /> : <HeartHandshake />}
            {creating ? "Đang tạo phiên…" : "Tạo Couple Session"}
          </Button>
        </CardContent>
      </Card>

      <div className="my-5 flex items-center gap-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> hoặc <span className="h-px flex-1 bg-border" />
      </div>

      <Card>
        <CardContent>
          <h2 className="font-black">Đã có mã mời?</h2>
          <div className="mt-4 flex gap-2">
            <input
              value={joinCode}
              onChange={(event) =>
                setJoinCode(
                  event.target.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, "")
                    .slice(0, 10),
                )
              }
              placeholder="X82K2Q"
              autoCapitalize="characters"
              className="min-h-12 min-w-0 flex-1 rounded-2xl border border-input bg-background px-4 font-mono text-base font-bold tracking-[0.18em] outline-none focus:ring-2 focus:ring-primary/30"
              aria-label="Mã Couple Session"
            />
            <Button size="icon" onClick={openJoinPage} aria-label="Tham gia phiên">
              <ArrowRight />
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <p
          className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-center text-xs font-semibold leading-5 text-red-700"
          role="alert"
        >
          {error}
        </p>
      )}
    </main>
  );
}
