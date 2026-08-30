"use client";

import type { Route } from "next";
import {
  ArrowLeft,
  Check,
  Clock3,
  Copy,
  HeartHandshake,
  Pencil,
  RefreshCcw,
  Send,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  getCoupleSession,
  saveCouplePreferences,
} from "@/features/couple/api/couple-session";
import { CoupleIntersectionSummary } from "@/features/couple/components/couple-intersection-summary";
import { CouplePreferenceForm } from "@/features/couple/components/couple-preference-form";
import { CoupleSwipeDeck } from "@/features/couple/components/couple-swipe-deck";
import type { CouplePreferenceRequest } from "@/features/couple/couple-contract";
import { cn } from "@/lib/utils";
import type { CoupleSessionSnapshot } from "@/types/couple";

export function CoupleRoom({ code }: { code: string }) {
  const [snapshot, setSnapshot] = useState<CoupleSessionSnapshot>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [saveError, setSaveError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [shareStatus, setShareStatus] = useState<string>();
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12_000);
    let active = true;
    void getCoupleSession(code, controller.signal)
      .then((result) => {
        if (!active) return;
        setSnapshot(result);
        setError(undefined);
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        if (requestError instanceof Error && requestError.name === "AbortError") {
          setError("Tải phiên hơi lâu. Hãy thử lại.");
          return;
        }
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Chưa thể tải Couple Session.",
        );
      })
      .finally(() => {
        window.clearTimeout(timeout);
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [code, reloadKey]);

  useEffect(() => {
    if (!snapshot || snapshot.intersection) return;
    const controllers = new Set<AbortController>();
    const interval = window.setInterval(() => {
      const controller = new AbortController();
      controllers.add(controller);
      void getCoupleSession(code, controller.signal)
        .then((result) => setSnapshot(result))
        .catch(() => undefined)
        .finally(() => controllers.delete(controller));
    }, 5_000);
    return () => {
      window.clearInterval(interval);
      controllers.forEach((controller) => controller.abort());
    };
  }, [code, snapshot]);

  const submitPreferences = async (preference: CouplePreferenceRequest) => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12_000);
    setSaving(true);
    setSaveError(undefined);
    try {
      setSnapshot(await saveCouplePreferences(code, preference, controller.signal));
      setEditing(false);
    } catch (requestError) {
      setSaveError(
        requestError instanceof Error && requestError.name !== "AbortError"
          ? requestError.message
          : "Lưu sở thích hơi lâu. Hãy thử lại.",
      );
    } finally {
      window.clearTimeout(timeout);
      setSaving(false);
    }
  };

  const share = async () => {
    if (!snapshot) return;
    const shareData = {
      title: "Đi Đâu Ăn Gì? · Couple Mode",
      text: `Vào chọn quán cùng mình nhé ❤️ Mã ${snapshot.code}`,
      url: snapshot.shareUrl,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setShareStatus("Đã mở bảng chia sẻ.");
      } else {
        await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
        setShareStatus("Đã sao chép link mời.");
      }
    } catch (shareError) {
      if (shareError instanceof Error && shareError.name === "AbortError") return;
      setShareStatus("Chưa chia sẻ được. Hãy thử sao chép mã.");
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setShareStatus("Đã sao chép mã phiên.");
    } catch {
      setShareStatus("Trình duyệt chưa cho phép sao chép.");
    }
  };

  if (loading) {
    return (
      <main className="animate-pulse space-y-4 px-4 py-6">
        <div className="h-11 w-28 rounded-2xl bg-muted" />
        <div className="h-40 rounded-3xl bg-muted" />
        <div className="h-72 rounded-3xl bg-muted" />
      </main>
    );
  }

  if (error || !snapshot) {
    const joinUrl = `/join/${encodeURIComponent(code)}` as Route;
    return (
      <main className="grid min-h-[calc(100svh-5rem)] place-items-center px-5 text-center">
        <section className="max-w-sm">
          <span className="mx-auto grid size-16 place-items-center rounded-3xl bg-secondary">
            <HeartHandshake className="size-7 text-primary" />
          </span>
          <h1 className="mt-5 text-2xl font-black">Chưa mở được phiên</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground" role="alert">
            {error ?? "Phiên không khả dụng."}
          </p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <Button asChild variant="outline"><Link href={joinUrl}>Tham gia</Link></Button>
            <Button
              onClick={() => {
                setLoading(true);
                setError(undefined);
                setReloadKey((value) => value + 1);
              }}
            >
              <RefreshCcw /> Thử lại
            </Button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/matches"><ArrowLeft /> Matches</Link>
        </Button>
        <span className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
          <Clock3 className="size-3.5" />
          Hết hạn {new Date(snapshot.expiresAt).toLocaleString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
            day: "2-digit",
            month: "2-digit",
          })}
        </span>
      </div>

      <Card className="mt-3 border-primary/15 bg-primary text-primary-foreground">
        <CardContent>
          <p className="text-xs font-bold text-primary-foreground/90">MÃ PHIÊN</p>
          <div className="mt-1 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => void copyCode()}
              className="flex min-h-11 items-center gap-2 font-mono text-2xl font-black tracking-[0.18em]"
              aria-label="Sao chép mã phiên"
            >
              {snapshot.code} <Copy className="size-4" />
            </button>
            <Button variant="secondary" size="sm" onClick={() => void share()}>
              <Send /> Mời người ấy
            </Button>
          </div>
          {shareStatus && (
            <p className="mt-2 text-xs font-semibold text-primary-foreground/90" role="status">
              {shareStatus}
            </p>
          )}
        </CardContent>
      </Card>

      <section className="mt-5 grid grid-cols-2 gap-3" aria-label="Thành viên">
        {[snapshot.own, snapshot.partner].map((member, index) => (
          <Card key={index} className={cn(!member && "border-dashed bg-transparent")}>
            <CardContent className="p-4 text-center">
              <span className="mx-auto grid size-10 place-items-center rounded-full bg-secondary">
                {member ? <UserRound className="size-4 text-primary" /> : "?"}
              </span>
              <p className="mt-2 truncate text-sm font-black">
                {member?.displayName ?? "Đang chờ…"}
              </p>
              <p className={cn(
                "mt-1 text-[11px] font-bold",
                member?.preferenceSubmitted ? "text-emerald-600" : "text-muted-foreground",
              )}>
                {member?.preferenceSubmitted ? "✓ Đã chọn riêng" : member ? "Chưa chọn" : "Gửi link mời"}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>

      <div className="mt-6">
        {snapshot.intersection && !editing ? (
          <>
            <CoupleIntersectionSummary intersection={snapshot.intersection} />
            {snapshot.intersection.hasCuisineMatch && (
              <CoupleSwipeDeck code={snapshot.code} />
            )}
            <Button className="mt-4 w-full" variant="outline" onClick={() => setEditing(true)}>
              <Pencil /> Sửa lựa chọn của tôi
            </Button>
          </>
        ) : snapshot.own.preferenceSubmitted && !editing ? (
          <Card>
            <CardContent className="py-8 text-center">
              <span className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                <Check className="size-6" />
              </span>
              <h2 className="mt-4 text-xl font-black">Đã khóa lựa chọn của bạn</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Lựa chọn vẫn được giữ kín. Kết quả chung sẽ hiện khi người ấy hoàn tất.
              </p>
              <Button className="mt-4" variant="outline" onClick={() => setEditing(true)}>
                <Pencil /> Chỉnh lại
              </Button>
            </CardContent>
          </Card>
        ) : (
          <CouplePreferenceForm
            initial={snapshot.own.preferences}
            submitting={saving}
            error={saveError}
            onSubmit={(preference) => void submitPreferences(preference)}
          />
        )}
      </div>
    </main>
  );
}
