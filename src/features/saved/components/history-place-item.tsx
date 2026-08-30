"use client";

import type { Route } from "next";
import { ChevronRight, Star, Trash2 } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GoogleMapsAttribution } from "@/features/restaurant/components/google-maps-attribution";
import { useLazyPlaceDetails } from "@/features/saved/hooks/use-lazy-place-details";
import type { PlaceHistoryRecord } from "@/types/saved";

function formatCost(value: number | null) {
  return value === null
    ? "Chưa ghi chi phí"
    : `Khoảng ${new Intl.NumberFormat("vi-VN").format(value)}đ`;
}

export function HistoryPlaceItem({
  record,
  busy,
  onDelete,
}: {
  record: PlaceHistoryRecord;
  busy: boolean;
  onDelete: () => void;
}) {
  const { containerRef, place, error } = useLazyPlaceDetails(record.googlePlaceId);
  const detailUrl = `/restaurant/${encodeURIComponent(record.googlePlaceId)}` as Route;
  const date = new Date(record.visitedAt);

  return (
    <article ref={containerRef} className="relative grid min-h-40 grid-cols-[3.5rem_1fr] gap-3">
      <div className="relative text-center">
        <span className="relative z-10 block rounded-2xl bg-primary px-1 py-2 text-primary-foreground">
          <strong className="block text-lg leading-none">{date.getDate()}</strong>
          <span className="mt-1 block text-[10px] font-bold">TH {date.getMonth() + 1}</span>
        </span>
        <span className="absolute bottom-[-1rem] left-1/2 top-12 w-px bg-border" />
      </div>

      <Card className="mb-4">
        <CardContent className="p-4">
          {place ? (
            <h2 className="text-lg font-black leading-tight">{place.displayName.text}</h2>
          ) : error ? (
            <p className="text-sm font-semibold text-muted-foreground">{error}</p>
          ) : (
            <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
          )}
          <div className="mt-2 flex flex-wrap gap-3 text-xs">
            {record.personalRating !== null && (
              <span className="flex items-center gap-1 font-bold">
                <Star className="size-3.5 fill-amber-400 text-amber-500" />
                {record.personalRating.toLocaleString("vi-VN")} điểm của bạn
              </span>
            )}
            <span className="text-muted-foreground">{formatCost(record.approximateCost)}</span>
          </div>
          {record.note && (
            <p className="mt-3 rounded-xl bg-secondary px-3 py-2 text-sm leading-6">
              {record.note}
            </p>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="outline"
              size="icon"
              disabled={busy}
              onClick={onDelete}
              aria-label="Xóa lần ghé"
            >
              <Trash2 />
            </Button>
            <Button asChild variant="secondary" size="sm">
              <Link href={detailUrl}>
                Xem lại <ChevronRight />
              </Link>
            </Button>
          </div>
          {place && <GoogleMapsAttribution className="mt-3 border-t pt-3" />}
        </CardContent>
      </Card>
    </article>
  );
}
