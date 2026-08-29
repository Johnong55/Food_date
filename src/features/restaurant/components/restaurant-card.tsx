"use client";

import {
  Check,
  ChevronRight,
  ExternalLink,
  MapPin,
  Navigation,
  Sparkles,
  Star,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GoogleMapsAttribution } from "@/features/restaurant/components/google-maps-attribution";
import { PlacePhoto } from "@/features/restaurant/components/place-photo";
import {
  buildGoogleMapsUrl,
  formatDistance,
  formatPlaceType,
  formatPriceLevel,
  formatReviewCount,
  getPlaceTags,
} from "@/features/restaurant/place-formatters";
import { cn } from "@/lib/utils";
import type { PlaceSummary } from "@/types/place";

type RestaurantCardProps = {
  place: PlaceSummary;
  selected: boolean;
  onSelect: () => void;
};

export function RestaurantCard({ place, selected, onSelect }: RestaurantCardProps) {
  const openNow = place.currentOpeningHours?.openNow;
  const tags = getPlaceTags(place);
  const mapsUrl = buildGoogleMapsUrl(place);
  const detailUrl = `/restaurant/${encodeURIComponent(place.id)}` as Route;

  return (
    <article aria-labelledby={`place-${place.id}`}>
      <Card
        className={cn(
          "overflow-hidden transition-[border-color,box-shadow,transform] duration-300",
          selected && "border-primary shadow-[0_18px_45px_-25px_rgba(205,73,51,0.75)]",
        )}
      >
        <PlacePhoto photo={place.photos[0]} placeName={place.displayName.text} />

        <CardContent className="space-y-4 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold text-primary">
                {place.primaryType ? formatPlaceType(place.primaryType) : "Địa điểm ăn uống"}
              </p>
              <h2
                id={`place-${place.id}`}
                className="mt-1 text-xl font-black leading-tight tracking-[-0.025em]"
              >
                {place.displayName.text}
              </h2>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full px-2.5 py-1 text-xs font-bold",
                openNow === true && "bg-emerald-100 text-emerald-700",
                openNow === false && "bg-red-100 text-red-700",
                openNow === undefined && "bg-muted text-muted-foreground",
              )}
            >
              {openNow === true
                ? "Đang mở"
                : openNow === false
                  ? "Đang đóng"
                  : "Chưa rõ giờ"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
            <span
              className="flex items-center gap-1 font-bold"
              aria-label={
                place.rating === undefined
                  ? "Chưa có Google rating"
                  : `Google rating ${place.rating} trên 5`
              }
            >
              <Star className="size-4 fill-amber-400 text-amber-500" />
              {place.rating?.toFixed(1) ?? "—"}
              <span className="font-medium text-muted-foreground">Google rating</span>
            </span>
            <span className="text-muted-foreground">
              {formatReviewCount(place.userRatingCount)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
            <span className="flex min-h-10 items-center gap-2 rounded-xl bg-muted px-3">
              <Navigation className="size-4 text-primary" />
              {formatDistance(place.distanceMeters)}
            </span>
            <span className="flex min-h-10 items-center gap-2 rounded-xl bg-muted px-3">
              <span className="font-black text-primary">₫</span>
              <span>{formatPriceLevel(place.priceLevel)}</span>
            </span>
          </div>

          {place.formattedAddress && (
            <p className="flex items-start gap-2 text-sm leading-5 text-muted-foreground">
              <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
              <span className="line-clamp-2">{place.formattedAddress}</span>
            </p>
          )}

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5" aria-label="Loại địa điểm">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold text-secondary-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {selected && (
            <p
              className="animate-in fade-in rounded-2xl bg-primary/10 px-3 py-2 text-sm font-bold text-primary"
              role="status"
            >
              <Sparkles className="mr-1.5 inline size-4" />
              Tối nay đi {place.displayName.text} nhé ❤️
            </p>
          )}

          <Button asChild variant="secondary" className="w-full">
            <Link href={detailUrl}>
              Xem chi tiết
              <ChevronRight />
            </Link>
          </Button>

          <div className="grid grid-cols-2 gap-2">
            <Button asChild variant="outline">
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
                Xem bản đồ
                <ExternalLink />
              </a>
            </Button>
            <Button onClick={onSelect} variant={selected ? "secondary" : "default"}>
              {selected ? <Check /> : <Sparkles />}
              {selected ? "Đã chọn" : "Chọn quán"}
            </Button>
          </div>

          <GoogleMapsAttribution className="border-t border-border/60 pt-3" />
        </CardContent>
      </Card>
    </article>
  );
}
