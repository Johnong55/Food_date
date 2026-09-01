"use client";

import { Check, LocateFixed, LoaderCircle, MapPin, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DISTANCE_OPTIONS,
  MANUAL_LOCATIONS,
} from "@/features/discovery/constants";
import { useCurrentLocation } from "@/features/discovery/hooks/use-current-location";
import type {
  DistanceId,
  SelectedLocation,
} from "@/features/discovery/types";
import { cn } from "@/lib/utils";

type LocationPickerProps = {
  selected: SelectedLocation | null;
  onSelect: (location: SelectedLocation) => void;
  onDistanceRecommendation: (distanceId: DistanceId) => void;
};

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("vi-VN")
    .trim();
}

export function LocationPicker({
  selected,
  onSelect,
  onDistanceRecommendation,
}: LocationPickerProps) {
  const [query, setQuery] = useState("");
  const { requestLocation, isLocating, error } = useCurrentLocation(onSelect);

  const filteredAreas = useMemo(() => {
    const normalizedQuery = normalizeSearch(query);
    if (!normalizedQuery) return MANUAL_LOCATIONS;
    return MANUAL_LOCATIONS.filter((area) =>
      normalizeSearch(area.label).includes(normalizedQuery),
    );
  }, [query]);

  return (
    <div>
      <Button
        type="button"
        variant={selected?.source === "current" ? "secondary" : "outline"}
        size="lg"
        className="w-full"
        onClick={requestLocation}
        disabled={isLocating}
      >
        {isLocating ? (
          <LoaderCircle className="animate-spin" aria-hidden="true" />
        ) : selected?.source === "current" ? (
          <Check aria-hidden="true" />
        ) : (
          <LocateFixed aria-hidden="true" />
        )}
        {isLocating
          ? "Đang tìm vị trí…"
          : selected?.source === "current"
            ? "Đã dùng vị trí hiện tại"
            : "Dùng vị trí của tôi"}
      </Button>

      {error && (
        <p className="mt-2 rounded-2xl bg-destructive/8 px-3 py-2 text-sm leading-5 text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="my-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        hoặc chọn khu vực
        <span className="h-px flex-1 bg-border" />
      </div>

      <label className="relative block">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <span className="sr-only">Tìm quận hoặc khu vực</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Tìm quận hoặc khu vực…"
          className="h-12 w-full rounded-2xl border border-input bg-card pl-10 pr-4 text-sm outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
      </label>

      <div className="mt-3 grid max-h-64 grid-cols-2 gap-2 overflow-y-auto pr-1">
        {filteredAreas.map((area) => {
          const isSelected = selected?.id === area.id;
          return (
            <button
              key={area.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => {
                onSelect({
                  id: area.id,
                  label: area.label,
                  coordinates: area.coordinates,
                  source: "manual",
                });
                onDistanceRecommendation(area.recommendedDistanceId);
              }}
              className={cn(
                "flex min-h-12 items-center gap-2 rounded-2xl border px-3 text-left text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/40",
                isSelected
                  ? "border-primary bg-primary/9 text-primary"
                  : "border-border bg-card",
              )}
            >
              <MapPin className="size-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block truncate">{area.label}</span>
                <span className="block text-[10px] font-medium text-muted-foreground">
                  Gợi ý {DISTANCE_OPTIONS.find(
                    (distance) => distance.id === area.recommendedDistanceId,
                  )?.label.replace("< ", "")}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {filteredAreas.length === 0 && (
        <p className="mt-4 rounded-2xl bg-muted p-4 text-center text-sm text-muted-foreground">
          Chưa có khu vực này. Hãy thử tên quận khác.
        </p>
      )}
    </div>
  );
}
