"use client";

import type { Route } from "next";
import { ArrowLeft, HeartHandshake, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { joinCoupleSession } from "@/features/couple/api/couple-session";

export function JoinCoupleSession({ code }: { code: string }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string>();

  const join = async () => {
    const name = displayName.trim();
    if (!name) {
      setError("Hãy nhập tên để tham gia phiên.");
      return;
    }
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12_000);
    setJoining(true);
    setError(undefined);
    try {
      const session = await joinCoupleSession(code, name, controller.signal);
      router.replace(`/couple/${session.code}` as Route);
    } catch (requestError) {
      setError(
        requestError instanceof Error && requestError.name !== "AbortError"
          ? requestError.message
          : "Tham gia phiên hơi lâu. Hãy thử lại nhé.",
      );
    } finally {
      window.clearTimeout(timeout);
      setJoining(false);
    }
  };

  return (
    <main className="grid min-h-[calc(100svh-5rem)] place-items-center px-4 py-8">
      <section className="w-full max-w-sm">
        <Button asChild variant="ghost" size="sm">
          <Link href="/matches">
            <ArrowLeft /> Couple Mode
          </Link>
        </Button>
        <Card className="mt-3 overflow-hidden">
          <CardContent className="text-center">
            <span className="mx-auto grid size-16 place-items-center rounded-[1.5rem] bg-rose-100 text-rose-600">
              <HeartHandshake className="size-7" />
            </span>
            <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-primary">
              Bạn được mời
            </p>
            <h1 className="mt-2 text-2xl font-black">Cùng chọn quán nhé ❤️</h1>
            <p className="mt-3 font-mono text-lg font-black tracking-[0.2em]">{code}</p>

            <label className="mt-6 block text-left">
              <span className="text-xs font-bold">Tên của bạn</span>
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value.slice(0, 40))}
                placeholder="Người ấy sẽ thấy tên này"
                autoComplete="nickname"
                className="mt-2 min-h-12 w-full rounded-2xl border border-input bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <Button
              className="mt-4 w-full"
              size="lg"
              onClick={() => void join()}
              disabled={joining}
            >
              {joining ? <LoaderCircle className="animate-spin" /> : <HeartHandshake />}
              {joining ? "Đang tham gia…" : "Tham gia phiên"}
            </Button>
            {error && (
              <p className="mt-4 text-xs font-semibold leading-5 text-red-700" role="alert">
                {error}
              </p>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
