"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import { useRef, useState } from "react";
import { Heart, MapPin, Navigation, Star, X, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GoogleMapsAttribution } from "@/features/restaurant/components/google-maps-attribution";
import { PlacePhoto } from "@/features/restaurant/components/place-photo";
import {
  formatDistance,
  formatPlaceType,
  formatPriceLevel,
  formatReviewCount,
  getPlaceTags,
} from "@/features/restaurant/place-formatters";
import { cn } from "@/lib/utils";
import type { SwipeDecision } from "@/types/couple";
import type { PlaceSummary } from "@/types/place";

const SWIPE_THRESHOLD = 82;

export function CoupleSwipeCard({
  place,
  busy,
  onDecision,
}: {
  place: PlaceSummary;
  busy: boolean;
  onDecision: (decision: SwipeDecision) => void;
}) {
  const pointerId = useRef<number | undefined>(undefined);
  const startX = useRef(0);
  const dragRef = useRef(0);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const tags = getPlaceTags(place);

  const updateDrag = (value: number) => {
    const bounded = Math.max(-150, Math.min(150, value));
    dragRef.current = bounded;
    setDragX(bounded);
  };

  const resetDrag = () => {
    pointerId.current = undefined;
    setDragging(false);
    updateDrag(0);
  };

  const pointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (busy) return;
    pointerId.current = event.pointerId;
    startX.current = event.clientX;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  };

  const pointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (pointerId.current !== event.pointerId) return;
    updateDrag(event.clientX - startX.current);
  };

  const pointerUp = (event: ReactPointerEvent<HTMLElement>) => {
    if (pointerId.current !== event.pointerId) return;
    const finalX = dragRef.current;
    resetDrag();
    if (finalX >= SWIPE_THRESHOLD) onDecision("right");
    if (finalX <= -SWIPE_THRESHOLD) onDecision("left");
  };

  return (
    <section aria-label={`Vuốt ${place.displayName.text}`}>
      <Card
        className={cn(
          "relative touch-pan-y select-none overflow-hidden border-primary/15 shadow-[0_24px_65px_-36px_rgba(80,30,20,0.65)]",
          !dragging && "transition-transform duration-200",
        )}
        style={{
          transform: `translateX(${dragX}px) rotate(${dragX / 28}deg)`,
        }}
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerCancel={resetDrag}
      >
        <div
          className={cn(
            "pointer-events-none absolute left-5 top-5 z-20 rotate-[-8deg] rounded-xl border-4 border-rose-500 bg-white/90 px-3 py-1 text-lg font-black text-rose-600 opacity-0",
            dragX < -25 && "opacity-100",
          )}
        >
          BỎ QUA
        </div>
        <div
          className={cn(
            "pointer-events-none absolute right-5 top-5 z-20 rotate-6 rounded-xl border-4 border-emerald-500 bg-white/90 px-3 py-1 text-lg font-black text-emerald-600 opacity-0",
            dragX > 25 && "opacity-100",
          )}
        >
          MUỐN ĂN
        </div>

        <PlacePhoto
          placeId={place.id}
          photo={place.photos[0]}
          placeName={place.displayName.text}
          className="aspect-[5/4]"
        />

        <CardContent className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold text-primary">
                {place.primaryType
                  ? formatPlaceType(place.primaryType)
                  : "Địa điểm ăn uống"}
              </p>
              <h3 className="mt-1 text-2xl font-black leading-tight tracking-[-0.035em]">
                {place.displayName.text}
              </h3>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold",
                place.currentOpeningHours?.openNow === true &&
                  "bg-emerald-100 text-emerald-700",
                place.currentOpeningHours?.openNow === false &&
                  "bg-red-100 text-red-700",
                place.currentOpeningHours?.openNow === undefined &&
                  "bg-muted text-muted-foreground",
              )}
            >
              {place.currentOpeningHours?.openNow === true
                ? "Đang mở"
                : place.currentOpeningHours?.openNow === false
                  ? "Đang đóng"
                  : "Chưa rõ giờ"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="flex items-center gap-1 font-black">
              <Star className="size-4 fill-amber-400 text-amber-500" />
              {place.rating?.toFixed(1) ?? "—"}
              <span className="font-medium text-muted-foreground">Google rating</span>
            </span>
            <span className="text-muted-foreground">
              {formatReviewCount(place.userRatingCount)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-bold">
            <span className="flex min-h-10 items-center gap-2 rounded-xl bg-muted px-3">
              <Navigation className="size-4 text-primary" />
              {formatDistance(place.distanceMeters)}
            </span>
            <span className="flex min-h-10 items-center gap-2 rounded-xl bg-muted px-3">
              <span className="text-primary">₫</span>
              {formatPriceLevel(place.priceLevel)}
            </span>
          </div>

          {place.formattedAddress && (
            <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
              <MapPin className="mt-0.5 size-3.5 shrink-0 text-primary" />
              <span className="line-clamp-2">{place.formattedAddress}</span>
            </p>
          )}

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          <GoogleMapsAttribution />
        </CardContent>
      </Card>

      <div className="mt-5 grid grid-cols-3 items-center justify-items-center gap-4">
        <Button
          type="button"
          variant="outline"
          className="size-14 rounded-full border-rose-200 text-rose-600 shadow-sm"
          disabled={busy}
          onClick={() => onDecision("left")}
          aria-label="Không thích quán này"
        >
          <X className="size-6" />
        </Button>
        <Button
          type="button"
          variant="outline"
          className="size-12 rounded-full border-amber-200 text-amber-600 shadow-sm"
          disabled={busy}
          onClick={() => onDecision("super_like")}
          aria-label="Rất muốn ăn quán này"
        >
          <Zap className="size-5 fill-current" />
        </Button>
        <Button
          type="button"
          className="size-14 rounded-full bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
          disabled={busy}
          onClick={() => onDecision("right")}
          aria-label="Muốn ăn quán này"
        >
          <Heart className="size-6 fill-current" />
        </Button>
      </div>
    </section>
  );
}
