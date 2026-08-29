import { DISTANCE_OPTIONS } from "@/features/discovery/constants";
import { LocationPicker } from "@/features/discovery/components/location-picker";
import { SelectionChip } from "@/features/discovery/components/selection-chip";
import { StepHeading } from "@/features/discovery/components/step-heading";
import type {
  DistanceId,
  SelectedLocation,
} from "@/features/discovery/types";

type LocationStepProps = {
  location: SelectedLocation | null;
  distanceId: DistanceId;
  onLocationChange: (location: SelectedLocation) => void;
  onDistanceChange: (id: DistanceId) => void;
};

export function LocationStep({
  location,
  distanceId,
  onLocationChange,
  onDistanceChange,
}: LocationStepProps) {
  return (
    <section>
      <StepHeading
        eyebrow="Khu vực"
        title="Mình muốn đi gần đâu?"
        description="App chỉ hỏi quyền vị trí khi bạn chủ động nhấn nút bên dưới."
      />

      <LocationPicker selected={location} onSelect={onLocationChange} />

      <fieldset className="mt-7">
        <legend className="mb-3 text-sm font-extrabold">Khoảng cách tối đa</legend>
        <div className="flex flex-wrap gap-2">
          {DISTANCE_OPTIONS.map((option) => (
            <SelectionChip
              key={option.id}
              selected={distanceId === option.id}
              onClick={() => onDistanceChange(option.id)}
            >
              {option.label}
            </SelectionChip>
          ))}
        </div>
      </fieldset>
    </section>
  );
}
