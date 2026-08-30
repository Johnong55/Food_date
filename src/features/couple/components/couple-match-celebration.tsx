"use client";

import type { Route } from "next";
import { HeartHandshake, UtensilsCrossed } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { PlacePhoto } from "@/features/restaurant/components/place-photo";
import type { PlaceSummary } from "@/types/place";

export function CoupleMatchCelebration({
  place,
  onContinue,
}: {
  place: PlaceSummary;
  onContinue: () => void;
}) {
  const detailUrl = `/restaurant/${encodeURIComponent(place.id)}` as Route;
  const menuUrl = `/menu/${encodeURIComponent(place.id)}` as Route;

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/55 p-3 backdrop-blur-sm sm:place-items-center">
      <section
        className="animate-in slide-in-from-bottom-8 w-full max-w-md overflow-hidden rounded-[2rem] bg-background shadow-2xl duration-300"
        role="dialog"
        aria-modal="true"
        aria-labelledby="couple-match-title"
      >
        <PlacePhoto
          photo={place.photos[0]}
          placeName={place.displayName.text}
          className="aspect-[16/9]"
        />
        <div className="p-5 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-rose-100 text-rose-600">
            <HeartHandshake className="size-7" />
          </span>
          <p className="mt-3 text-xs font-black uppercase tracking-[0.2em] text-rose-600">
            🎉 Match!
          </p>
          <h2 id="couple-match-title" className="mt-1 text-2xl font-black">
            Cả hai đều muốn ăn ở {place.displayName.text}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Lựa chọn chỉ được tiết lộ vì hai bạn đã cùng thích quán này.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <Button asChild>
              <Link href={detailUrl}>Đi luôn</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href={menuUrl}>
                <UtensilsCrossed /> Xem menu
              </Link>
            </Button>
          </div>
          <Button className="mt-2 w-full" variant="ghost" onClick={onContinue}>
            Tìm thêm
          </Button>
        </div>
      </section>
    </div>
  );
}
