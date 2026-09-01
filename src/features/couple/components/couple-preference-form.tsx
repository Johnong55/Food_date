"use client";

import { Check, LoaderCircle } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  CUISINE_OPTIONS,
  MANUAL_LOCATIONS,
  MOOD_OPTIONS,
  PREFERENCE_OPTIONS,
  RATING_OPTIONS,
  REVIEW_OPTIONS,
} from "@/features/discovery/constants";
import { cn } from "@/lib/utils";
import type { CouplePreference } from "@/types/couple";

const BUDGET_MAX_OPTIONS = [
  { value: 100_000, label: "100k" },
  { value: 200_000, label: "200k" },
  { value: 300_000, label: "300k" },
  { value: 400_000, label: "400k" },
  { value: 700_000, label: "700k" },
  { value: null, label: "Không giới hạn" },
] as const;

const RADIUS_OPTIONS = [
  { value: 1_000, label: "1 km" },
  { value: 3_000, label: "3 km" },
  { value: 5_000, label: "5 km" },
  { value: 10_000, label: "10 km" },
  { value: null, label: "Không quan trọng" },
] as const;

type CouplePreferenceFormProps = {
  initial?: CouplePreference;
  submitting: boolean;
  error?: string;
  onSubmit: (preference: CouplePreference) => void;
};

function ChoiceButton({
  selected,
  children,
  onClick,
}: {
  selected: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "min-h-11 rounded-2xl border px-3 py-2 text-xs font-bold transition-colors",
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-foreground",
      )}
    >
      {children}
    </button>
  );
}

export function CouplePreferenceForm({
  initial,
  submitting,
  error,
  onSubmit,
}: CouplePreferenceFormProps) {
  const [cuisines, setCuisines] = useState<CouplePreference["cuisines"]>(
    initial?.cuisines ?? [],
  );
  const [budgetMax, setBudgetMax] = useState<number | null>(
    initial ? initial.budgetMaxPerPerson : 400_000,
  );
  const [radius, setRadius] = useState<CouplePreference["radiusMeters"]>(
    initial ? initial.radiusMeters : 5_000,
  );
  const [minRating, setMinRating] = useState<CouplePreference["minRating"]>(
    initial?.minRating ?? 4,
  );
  const [minReviewCount, setMinReviewCount] = useState<
    CouplePreference["minReviewCount"]
  >(initial?.minReviewCount ?? 50);
  const [moods, setMoods] = useState<CouplePreference["moods"]>(
    initial?.moods ?? [],
  );
  const [options, setOptions] = useState<CouplePreference["options"]>(
    initial?.options ?? [],
  );
  const [locationId, setLocationId] = useState(
    initial?.location.id ?? MANUAL_LOCATIONS[0]!.id,
  );
  const [formError, setFormError] = useState<string>();

  const toggleCuisine = (id: CouplePreference["cuisines"][number]) => {
    setFormError(undefined);
    setCuisines((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : current.length < 3
          ? [...current, id]
          : current,
    );
  };

  const toggleMood = (id: CouplePreference["moods"][number]) => {
    setMoods((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : current.length < 4
          ? [...current, id]
          : current,
    );
  };

  const toggleOption = (id: CouplePreference["options"][number]) => {
    setOptions((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (cuisines.length === 0) {
      setFormError("Hãy chọn ít nhất một loại món.");
      return;
    }
    const location = MANUAL_LOCATIONS.find((area) => area.id === locationId);
    if (!location) {
      setFormError("Khu vực chưa hợp lệ.");
      return;
    }
    onSubmit({
      cuisines,
      budgetMaxPerPerson: budgetMax,
      radiusMeters: radius,
      minRating,
      minReviewCount,
      moods,
      options,
      location: {
        id: location.id,
        label: location.label,
        coordinates: location.coordinates,
        source: "manual",
      },
    });
  };

  return (
    <form onSubmit={submit} className="space-y-7">
      <section>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-primary">01</p>
            <h2 className="text-xl font-black">Bạn muốn ăn gì?</h2>
          </div>
          <span className="text-[11px] font-semibold text-muted-foreground">
            Tối đa 3
          </span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {CUISINE_OPTIONS.filter((item) => item.id !== "random").map((item) => (
            <ChoiceButton
              key={item.id}
              selected={cuisines.includes(item.id)}
              onClick={() => toggleCuisine(item.id)}
            >
              <span className="block text-lg" aria-hidden="true">{item.emoji}</span>
              <span className="mt-0.5 block">{item.label}</span>
            </ChoiceButton>
          ))}
        </div>
      </section>

      <section>
        <p className="text-xs font-bold text-primary">02</p>
        <h2 className="text-xl font-black">Tối đa mỗi người</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {BUDGET_MAX_OPTIONS.map((item) => (
            <ChoiceButton
              key={item.label}
              selected={budgetMax === item.value}
              onClick={() => setBudgetMax(item.value)}
            >
              {item.label}
            </ChoiceButton>
          ))}
        </div>
      </section>

      <section>
        <p className="text-xs font-bold text-primary">03</p>
        <h2 className="text-xl font-black">Khu vực và khoảng cách</h2>
        <label className="mt-3 block">
          <span className="sr-only">Chọn khu vực</span>
          <select
            value={locationId}
            onChange={(event) => {
              const nextLocationId = event.target.value;
              const nextLocation = MANUAL_LOCATIONS.find(
                (area) => area.id === nextLocationId,
              );
              setLocationId(nextLocationId);
              if (nextLocation) {
                setRadius(
                  nextLocation.recommendedDistanceId === "3km" ? 3_000 : 5_000,
                );
              }
            }}
            className="min-h-12 w-full rounded-2xl border border-input bg-background px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/30"
          >
            {MANUAL_LOCATIONS.map((area) => (
              <option key={area.id} value={area.id}>{area.label}</option>
            ))}
          </select>
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          {RADIUS_OPTIONS.map((item) => (
            <ChoiceButton
              key={item.label}
              selected={radius === item.value}
              onClick={() => setRadius(item.value)}
            >
              {item.label}
            </ChoiceButton>
          ))}
        </div>
      </section>

      <section>
        <p className="text-xs font-bold text-primary">04</p>
        <h2 className="text-xl font-black">Không khí mong muốn</h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {MOOD_OPTIONS.map((item) => (
            <ChoiceButton
              key={item.id}
              selected={moods.includes(item.id)}
              onClick={() => toggleMood(item.id)}
            >
              {item.emoji} {item.label}
            </ChoiceButton>
          ))}
        </div>
      </section>

      <section>
        <p className="text-xs font-bold text-primary">05</p>
        <h2 className="text-xl font-black">Chất lượng tối thiểu</h2>
        <p className="mt-3 text-xs font-bold text-muted-foreground">Google rating</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {RATING_OPTIONS.map((rating) => (
            <ChoiceButton
              key={rating}
              selected={minRating === rating}
              onClick={() => setMinRating(rating)}
            >
              ⭐ {rating}+
            </ChoiceButton>
          ))}
        </div>
        <p className="mt-4 text-xs font-bold text-muted-foreground">Số đánh giá</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {REVIEW_OPTIONS.map((reviews) => (
            <ChoiceButton
              key={reviews}
              selected={minReviewCount === reviews}
              onClick={() => setMinReviewCount(reviews)}
            >
              {reviews.toLocaleString("vi-VN")}+
            </ChoiceButton>
          ))}
        </div>
      </section>

      <section>
        <p className="text-xs font-bold text-primary">06</p>
        <h2 className="text-xl font-black">Yêu cầu thêm</h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {PREFERENCE_OPTIONS.map((item) => (
            <ChoiceButton
              key={item.id}
              selected={options.includes(item.id)}
              onClick={() => toggleOption(item.id)}
            >
              <span className="inline-flex items-center gap-1.5">
                {options.includes(item.id) && <Check className="size-3.5" />}
                {item.emoji} {item.label}
              </span>
            </ChoiceButton>
          ))}
        </div>
      </section>

      {(formError || error) && (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-xs font-semibold text-red-700" role="alert">
          {formError ?? error}
        </p>
      )}

      <Button type="submit" className="w-full" size="lg" disabled={submitting}>
        {submitting ? <LoaderCircle className="animate-spin" /> : <HeartIcon />}
        {submitting ? "Đang lưu riêng tư…" : "Xong phần của tôi ❤️"}
      </Button>
    </form>
  );
}

function HeartIcon() {
  return <span aria-hidden="true">❤️</span>;
}
