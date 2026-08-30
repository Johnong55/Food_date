"use client";

import { Heart, LoaderCircle, LogIn } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  OwnedDataApiError,
  savePlace,
} from "@/features/saved/api/owned-data";
import { cn } from "@/lib/utils";

export function SavePlaceButton({
  placeId,
  className,
}: {
  placeId: string;
  className?: string;
}) {
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [error, setError] = useState<string>();

  const save = async () => {
    if (saved || saving) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12_000);
    setSaved(true);
    setSaving(true);
    setError(undefined);
    try {
      await savePlace({ googlePlaceId: placeId, collectionId: null }, controller.signal);
    } catch (requestError) {
      setSaved(false);
      if (
        requestError instanceof OwnedDataApiError &&
        requestError.code === "AUTH_REQUIRED"
      ) {
        setAuthRequired(true);
      } else {
        setError(
          requestError instanceof Error && requestError.name !== "AbortError"
            ? requestError.message
            : "Lưu quán hơi lâu. Hãy thử lại.",
        );
      }
    } finally {
      window.clearTimeout(timeout);
      setSaving(false);
    }
  };

  if (authRequired) {
    return (
      <Button asChild variant="outline" className={className}>
        <Link href="/profile">
          <LogIn /> Đăng nhập để lưu
        </Link>
      </Button>
    );
  }

  return (
    <div className={cn("min-w-0", className)}>
      <Button
        type="button"
        variant={saved ? "secondary" : "outline"}
        className="w-full"
        disabled={saving || saved}
        onClick={() => void save()}
      >
        {saving ? (
          <LoaderCircle className="animate-spin" />
        ) : (
          <Heart className={cn(saved && "fill-current")} />
        )}
        {saving ? "Đang lưu…" : saved ? "Đã lưu" : "Lưu quán"}
      </Button>
      {error && (
        <p className="mt-1 text-center text-[11px] font-semibold text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
