import {
  BUDGET_OPTIONS,
  RATING_OPTIONS,
  REVIEW_OPTIONS,
} from "@/features/discovery/constants";
import { SelectionChip } from "@/features/discovery/components/selection-chip";
import { StepHeading } from "@/features/discovery/components/step-heading";
import type {
  BudgetId,
  RatingThreshold,
  ReviewThreshold,
} from "@/features/discovery/types";

type BudgetStepProps = {
  budgetId: BudgetId | null;
  minRating: RatingThreshold;
  minReviewCount: ReviewThreshold;
  onBudgetChange: (id: BudgetId) => void;
  onRatingChange: (rating: RatingThreshold) => void;
  onReviewCountChange: (count: ReviewThreshold) => void;
};

export function BudgetStep({
  budgetId,
  minRating,
  minReviewCount,
  onBudgetChange,
  onRatingChange,
  onReviewCountChange,
}: BudgetStepProps) {
  return (
    <section>
      <StepHeading
        eyebrow="Ngân sách & chất lượng"
        title="Bao nhiêu là vừa?"
        description="Ngân sách tính cho mỗi người. Rating bên dưới là Google rating."
      />

      <fieldset>
        <legend className="mb-3 text-sm font-extrabold">Ngân sách / người</legend>
        <div className="space-y-2.5">
          {BUDGET_OPTIONS.map((option) => (
            <SelectionChip
              key={option.id}
              selected={budgetId === option.id}
              onClick={() => onBudgetChange(option.id)}
              layout="card"
              className="w-full"
            >
              <span className="block">
                <span className="block font-extrabold">{option.label}</span>
                <span className="mt-0.5 block text-xs font-medium text-muted-foreground">
                  {option.detail}
                </span>
              </span>
            </SelectionChip>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-7">
        <legend className="mb-3 text-sm font-extrabold">Google rating tối thiểu</legend>
        <div className="grid grid-cols-4 gap-2">
          {RATING_OPTIONS.map((rating) => (
            <SelectionChip
              key={rating}
              selected={minRating === rating}
              onClick={() => onRatingChange(rating)}
              className="px-2"
            >
              ⭐ {rating}+
            </SelectionChip>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-7">
        <legend className="mb-3 text-sm font-extrabold">Số review tối thiểu</legend>
        <div className="flex flex-wrap gap-2">
          {REVIEW_OPTIONS.map((count) => (
            <SelectionChip
              key={count}
              selected={minReviewCount === count}
              onClick={() => onReviewCountChange(count)}
            >
              {count.toLocaleString("vi-VN")}+
            </SelectionChip>
          ))}
        </div>
      </fieldset>
    </section>
  );
}
