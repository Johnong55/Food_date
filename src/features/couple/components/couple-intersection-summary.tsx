import { AlertCircle, HeartHandshake, MapPin, ShieldCheck, Star } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import {
  CUISINE_OPTIONS,
  MOOD_OPTIONS,
  PREFERENCE_OPTIONS,
  findOptionLabel,
} from "@/features/discovery/constants";
import type { CoupleIntersection } from "@/types/couple";

function formatBudget(value: number | null) {
  return value === null
    ? "Không giới hạn"
    : `Tối đa ${new Intl.NumberFormat("vi-VN").format(value)}đ/người`;
}

function formatRadius(value: number | null) {
  if (value === null) return "Khoảng cách không quan trọng";
  return `Trong ${(value / 1_000).toLocaleString("vi-VN")} km`;
}

export function CoupleIntersectionSummary({
  intersection,
}: {
  intersection: CoupleIntersection;
}) {
  return (
    <section className="space-y-4">
      <Card className="overflow-hidden border-rose-200 bg-gradient-to-br from-rose-50 to-orange-50">
        <CardContent>
          <span className="grid size-14 place-items-center rounded-[1.25rem] bg-white text-2xl shadow-sm">
            🎉
          </span>
          <p className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-rose-600">
            Gu chung của hai bạn
          </p>
          <h2 className="mt-1 text-2xl font-black">Đã tìm thấy điểm gặp nhau</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Đây là logic “Độ phù hợp” của ứng dụng, không phải Google Score.
          </p>
        </CardContent>
      </Card>

      {!intersection.hasCuisineMatch && (
        <div className="flex gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-amber-800">
          <AlertCircle className="mt-0.5 size-5 shrink-0" />
          <p className="text-xs font-semibold leading-5">
            Hai bạn chưa chọn chung loại món nào. Hãy sửa lựa chọn trước khi tạo bộ quán.
          </p>
        </div>
      )}

      <Card>
        <CardContent className="space-y-5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Loại món chung
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {intersection.cuisines.length > 0 ? (
                intersection.cuisines.map((cuisine) => (
                  <span key={cuisine} className="rounded-full bg-secondary px-3 py-1.5 text-xs font-bold">
                    {findOptionLabel(CUISINE_OPTIONS, cuisine)}
                  </span>
                ))
              ) : (
                <span className="text-sm font-semibold text-amber-700">Chưa có món chung</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-muted p-3">
              <p className="text-[11px] font-bold text-muted-foreground">NGÂN SÁCH CỨNG</p>
              <p className="mt-1 font-black">{formatBudget(intersection.budgetMaxPerPerson)}</p>
            </div>
            <div className="rounded-2xl bg-muted p-3">
              <p className="text-[11px] font-bold text-muted-foreground">BÁN KÍNH CỨNG</p>
              <p className="mt-1 font-black">{formatRadius(intersection.radiusMeters)}</p>
            </div>
          </div>

          <p className="flex items-start gap-2 text-sm leading-6">
            <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
            {intersection.location.label}
          </p>
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Star className="size-4 fill-amber-400 text-amber-500" />
            Google rating {intersection.minRating}+ · {intersection.minReviewCount.toLocaleString("vi-VN")}+ đánh giá
          </p>

          {intersection.moods.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Cả hai cùng thích
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {intersection.moods.map((mood) => (
                  <span key={mood} className="rounded-full bg-rose-100 px-3 py-1.5 text-xs font-bold text-rose-700">
                    {findOptionLabel(MOOD_OPTIONS, mood)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {intersection.requiredOptions.length > 0 && (
            <div>
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                <ShieldCheck className="size-3.5" /> Yêu cầu bắt buộc của một trong hai
              </p>
              <p className="mt-2 text-sm font-semibold leading-6">
                {intersection.requiredOptions
                  .map((option) => findOptionLabel(PREFERENCE_OPTIONS, option))
                  .join(" · ")}
              </p>
            </div>
          )}

          {intersection.sharedOptions.length > 0 && (
            <p className="flex items-start gap-2 text-sm leading-6">
              <HeartHandshake className="mt-0.5 size-4 shrink-0 text-primary" />
              {intersection.sharedOptions
                .map((option) => findOptionLabel(PREFERENCE_OPTIONS, option))
                .join(" · ")}
            </p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
