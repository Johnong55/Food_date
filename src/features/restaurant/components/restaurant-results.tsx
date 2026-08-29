"use client";

import { ArrowLeft, MapPin, SlidersHorizontal } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { RestaurantCard } from "@/features/restaurant/components/restaurant-card";
import type { SearchApiData } from "@/features/discovery/search-contract";
import type { FoodSearchDraft } from "@/features/discovery/types";

type RestaurantResultsProps = {
  draft: FoodSearchDraft;
  result: SearchApiData;
  onEdit: () => void;
};

export function RestaurantResults({
  draft,
  result,
  onEdit,
}: RestaurantResultsProps) {
  const [selectedPlaceId, setSelectedPlaceId] = useState<string>();
  const hasDeferredFilters = result.meta.deferredFilters.length > 0;

  return (
    <main className="px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))]">
      <header className="mb-5">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Sửa tiêu chí">
            <ArrowLeft />
          </Button>
          <Button variant="ghost" onClick={onEdit}>
            <SlidersHorizontal />
            Bộ lọc
          </Button>
        </div>

        <p className="mt-4 text-sm font-bold text-primary">
          {result.places.length} quán · giữ thứ tự Google Maps
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-[-0.04em]">
          Chọn quán tối nay
        </h1>
        <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="size-4 text-primary" />
          Quanh {draft.location.label}
        </p>

        {hasDeferredFilters && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
            <p className="font-bold">Một số tiêu chí chưa thể xác minh từ kết quả search.</p>
            <p>
              Giá/người, mood và tiện ích sẽ chỉ được xác nhận khi có dữ liệu đủ tin cậy;
              app không tự khẳng định quán nằm trong ngân sách.
            </p>
          </div>
        )}
      </header>

      <section className="space-y-5" aria-label="Kết quả nhà hàng từ Google Maps">
        {result.places.map((place) => (
          <RestaurantCard
            key={place.id}
            place={place}
            selected={selectedPlaceId === place.id}
            onSelect={() => setSelectedPlaceId(place.id)}
          />
        ))}
      </section>
    </main>
  );
}
