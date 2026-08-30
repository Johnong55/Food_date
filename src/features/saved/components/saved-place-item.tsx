"use client";

import type { Route } from "next";
import { ChevronRight, MapPin, Star, Trash2 } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GoogleMapsAttribution } from "@/features/restaurant/components/google-maps-attribution";
import { PlacePhoto } from "@/features/restaurant/components/place-photo";
import { formatReviewCount } from "@/features/restaurant/place-formatters";
import { useLazyPlaceDetails } from "@/features/saved/hooks/use-lazy-place-details";
import type { SavedCollection, SavedPlaceRecord } from "@/types/saved";

export function SavedPlaceItem({
  record,
  collections,
  busy,
  onMove,
  onDelete,
}: {
  record: SavedPlaceRecord;
  collections: SavedCollection[];
  busy: boolean;
  onMove: (collectionId: string | null) => void;
  onDelete: () => void;
}) {
  const { containerRef, place, error } = useLazyPlaceDetails(record.googlePlaceId);
  const detailUrl = `/restaurant/${encodeURIComponent(record.googlePlaceId)}` as Route;

  return (
    <article ref={containerRef} className="min-h-44">
      <Card className="overflow-hidden">
        {place ? (
          <PlacePhoto
            photo={place.photos[0]}
            placeName={place.displayName.text}
            className="aspect-[16/8]"
          />
        ) : (
          <div className="aspect-[16/6] animate-pulse bg-secondary" />
        )}
        <CardContent className="p-4">
          {place ? (
            <>
              <h2 className="text-lg font-black leading-tight">{place.displayName.text}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                <span className="flex items-center gap-1 font-bold">
                  <Star className="size-3.5 fill-amber-400 text-amber-500" />
                  {place.rating?.toFixed(1) ?? "—"} Google rating
                </span>
                <span className="text-muted-foreground">
                  {formatReviewCount(place.userRatingCount)}
                </span>
              </div>
              {place.formattedAddress && (
                <p className="mt-2 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
                  <MapPin className="mt-0.5 size-3.5 shrink-0 text-primary" />
                  <span className="line-clamp-2">{place.formattedAddress}</span>
                </p>
              )}
            </>
          ) : error ? (
            <p className="text-sm font-semibold text-muted-foreground" role="status">
              {error} Place ID vẫn được giữ an toàn.
            </p>
          ) : (
            <div className="space-y-2" aria-label="Đang tải thông tin quán">
              <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
            </div>
          )}

          <div className="mt-4 flex items-center gap-2">
            <label className="min-w-0 flex-1">
              <span className="sr-only">Chuyển bộ sưu tập</span>
              <select
                value={record.collectionId ?? ""}
                disabled={busy}
                onChange={(event) => onMove(event.target.value || null)}
                className="min-h-11 w-full rounded-xl border bg-background px-3 text-xs font-bold"
              >
                <option value="">Chưa phân loại</option>
                {collections.map((collection) => (
                  <option key={collection.id} value={collection.id}>
                    {collection.name}
                  </option>
                ))}
              </select>
            </label>
            <Button
              size="icon"
              variant="outline"
              disabled={busy}
              onClick={onDelete}
              aria-label="Xóa khỏi danh sách đã lưu"
            >
              <Trash2 />
            </Button>
            <Button asChild size="icon" variant="secondary">
              <Link href={detailUrl} aria-label="Xem chi tiết quán">
                <ChevronRight />
              </Link>
            </Button>
          </div>
          {place && <GoogleMapsAttribution className="mt-3 border-t pt-3" />}
        </CardContent>
      </Card>
    </article>
  );
}
