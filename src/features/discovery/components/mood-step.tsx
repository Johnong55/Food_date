import { MOOD_OPTIONS } from "@/features/discovery/constants";
import { SelectionChip } from "@/features/discovery/components/selection-chip";
import { StepHeading } from "@/features/discovery/components/step-heading";
import type { MoodId } from "@/features/discovery/types";

type MoodStepProps = {
  selected: MoodId[];
  onToggle: (id: MoodId) => void;
};

export function MoodStep({ selected, onToggle }: MoodStepProps) {
  return (
    <section aria-labelledby="mood-title">
      <StepHeading
        titleId="mood-title"
        eyebrow="Không khí"
        title="Hôm nay muốn ăn kiểu gì?"
        description="Chọn những cảm giác quan trọng nhất, tối đa 4 lựa chọn."
        aside={
          <span className="shrink-0 rounded-full bg-secondary px-3 py-1.5 text-xs font-bold text-secondary-foreground">
            {selected.length}/4
          </span>
        }
      />
      <div className="flex flex-wrap gap-2.5">
        {MOOD_OPTIONS.map((option) => (
          <SelectionChip
            key={option.id}
            selected={selected.includes(option.id)}
            onClick={() => onToggle(option.id)}
            leading={option.emoji}
          >
            {option.label}
          </SelectionChip>
        ))}
      </div>
    </section>
  );
}
