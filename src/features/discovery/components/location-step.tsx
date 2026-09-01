import {
  DISTANCE_OPTIONS,
  getManualLocation,
} from "@/features/discovery/constants";
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
  const manualLocation = location ? getManualLocation(location.id) : undefined;
  const recommendedDistance = manualLocation
    ? DISTANCE_OPTIONS.find(
        (distance) => distance.id === manualLocation.recommendedDistanceId,
      )
    : undefined;

  return (
    <section>
      <StepHeading
        eyebrow="Khu vực"
        title="Mình muốn đi gần đâu?"
        description="App chỉ hỏi quyền vị trí khi bạn chủ động nhấn nút bên dưới."
      />

      <LocationPicker
        selected={location}
        onSelect={onLocationChange}
        onDistanceRecommendation={onDistanceChange}
      />

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

      {location?.source === "manual" && manualLocation && (
        <p className="mt-3 rounded-2xl bg-secondary/70 px-3 py-2 text-xs leading-5 text-muted-foreground">
          Tâm tìm kiếm đặt tại {location.label}. Bán kính gợi ý là{" "}
          {recommendedDistance?.label.replace("< ", "")}; bạn có thể chọn 10 km
          để mở rộng thêm.
        </p>
      )}
    </section>
  );
}
