import { Check, Info } from "lucide-react";

import {
  BUDGET_OPTIONS,
  CUISINE_OPTIONS,
  DISTANCE_OPTIONS,
  MOOD_OPTIONS,
  PREFERENCE_OPTIONS,
  findOptionLabel,
} from "@/features/discovery/constants";
import type {
  FoodPreferenceState,
  PreferenceOptionId,
} from "@/features/discovery/types";
import { cn } from "@/lib/utils";

import { StepHeading } from "./step-heading";

type OptionsStepProps = {
  state: FoodPreferenceState;
  onToggle: (id: PreferenceOptionId) => void;
};

export function OptionsStep({ state, onToggle }: OptionsStepProps) {
  const cuisineLabels = state.cuisines.map((id) =>
    findOptionLabel(CUISINE_OPTIONS, id),
  );
  const moodLabels = state.moods.map((id) => findOptionLabel(MOOD_OPTIONS, id));
  const budgetLabel = state.budgetId
    ? findOptionLabel(BUDGET_OPTIONS, state.budgetId)
    : "Chưa chọn";
  const distanceLabel = findOptionLabel(DISTANCE_OPTIONS, state.distanceId);

  return (
    <section>
      <StepHeading
        eyebrow="Chạm cuối"
        title="Có gì là bắt buộc?"
        description="Chọn thêm tiện ích nếu cần. Dữ liệu không được Google hỗ trợ sẽ chỉ áp dụng khi có nguồn đáng tin cậy."
      />

      <div className="grid grid-cols-2 gap-2.5">
        {PREFERENCE_OPTIONS.map((option) => {
          const selected = state.options.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              role="switch"
              aria-checked={selected}
              onClick={() => onToggle(option.id)}
              className={cn(
                "flex min-h-20 items-center gap-3 rounded-3xl border p-3 text-left text-sm font-bold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/40",
                selected
                  ? "border-primary bg-primary/9 text-primary"
                  : "border-border bg-card",
              )}
            >
              <span className="text-xl" aria-hidden="true">{option.emoji}</span>
              <span className="min-w-0 flex-1">{option.label}</span>
              <span
                className={cn(
                  "grid size-5 shrink-0 place-items-center rounded-full border",
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border",
                )}
              >
                {selected && <Check className="size-3" strokeWidth={3} />}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 rounded-3xl border border-border/70 bg-card p-4">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
          Tóm tắt lựa chọn
        </p>
        <dl className="mt-3 grid gap-2.5 text-sm">
          <div className="flex gap-3">
            <dt className="w-20 shrink-0 text-muted-foreground">Món</dt>
            <dd className="font-semibold">{cuisineLabels.join(", ")}</dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-20 shrink-0 text-muted-foreground">Mood</dt>
            <dd className="font-semibold">{moodLabels.join(", ")}</dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-20 shrink-0 text-muted-foreground">Ngân sách</dt>
            <dd className="font-semibold">{budgetLabel}/người</dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-20 shrink-0 text-muted-foreground">Khu vực</dt>
            <dd className="font-semibold">
              {state.location?.label} · {distanceLabel}
            </dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-20 shrink-0 text-muted-foreground">Chất lượng</dt>
            <dd className="font-semibold">
              Google {state.minRating}+ · {state.minReviewCount.toLocaleString("vi-VN")}+ reviews
            </dd>
          </div>
        </dl>
      </div>

      <p className="mt-3 flex gap-2 text-xs leading-5 text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        Ngân sách chỉ là hard filter khi có menu hoặc dữ liệu giá đủ tin cậy.
      </p>
    </section>
  );
}
