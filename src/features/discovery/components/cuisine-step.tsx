import { CUISINE_OPTIONS } from "@/features/discovery/constants";
import { SelectionChip } from "@/features/discovery/components/selection-chip";
import { StepHeading } from "@/features/discovery/components/step-heading";
import type { CuisineId } from "@/features/discovery/types";

type CuisineStepProps = {
  selected: CuisineId[];
  onToggle: (id: CuisineId) => void;
};

export function CuisineStep({ selected, onToggle }: CuisineStepProps) {
  return (
    <section aria-labelledby="cuisine-title">
      <StepHeading
        titleId="cuisine-title"
        eyebrow="Chọn món"
        title="Tụi mình thèm gì?"
        description="Chọn tối đa 3 loại món. Random sẽ để app chọn bất ngờ."
        aside={
          <span className="shrink-0 rounded-full bg-secondary px-3 py-1.5 text-xs font-bold text-secondary-foreground">
            {selected.length}/3
          </span>
        }
      />
      <div className="grid grid-cols-2 gap-2.5">
        {CUISINE_OPTIONS.map((option) => (
          <SelectionChip
            key={option.id}
            selected={selected.includes(option.id)}
            onClick={() => onToggle(option.id)}
            leading={option.emoji}
            layout="card"
            className={option.id === "random" ? "col-span-2" : undefined}
          >
            {option.label}
          </SelectionChip>
        ))}
      </div>
    </section>
  );
}
