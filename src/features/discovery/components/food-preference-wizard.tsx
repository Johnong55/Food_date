"use client";

import { ChevronRight, Heart, LoaderCircle } from "lucide-react";
import { useReducer, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { BudgetStep } from "@/features/discovery/components/budget-step";
import { CuisineStep } from "@/features/discovery/components/cuisine-step";
import { DiscoveryReady } from "@/features/discovery/components/discovery-ready";
import { LocationStep } from "@/features/discovery/components/location-step";
import { MoodStep } from "@/features/discovery/components/mood-step";
import { OptionsStep } from "@/features/discovery/components/options-step";
import { WizardHeader } from "@/features/discovery/components/wizard-header";
import { searchRestaurantPlaces } from "@/features/discovery/api/search-restaurants";
import {
  canContinueFromStep,
  createInitialPreferences,
  preferenceReducer,
} from "@/features/discovery/preference-reducer";
import { toFoodSearchDraft } from "@/features/discovery/preference-schema";
import { applySearchRelaxation } from "@/features/discovery/search-relaxation";
import type {
  RelaxationSuggestion,
  SearchApiData,
} from "@/features/discovery/search-contract";
import type { FoodSearchDraft } from "@/features/discovery/types";
import {
  DISTANCE_OPTIONS,
  RATING_OPTIONS,
  REVIEW_OPTIONS,
} from "@/features/discovery/constants";

const TOTAL_STEPS = 5;

type FoodPreferenceWizardProps = {
  initialMode?: "food" | "random";
};

export function FoodPreferenceWizard({
  initialMode = "food",
}: FoodPreferenceWizardProps) {
  const router = useRouter();
  const [state, dispatch] = useReducer(
    preferenceReducer,
    initialMode === "random",
    createInitialPreferences,
  );
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<FoodSearchDraft | null>(null);
  const [searchResult, setSearchResult] = useState<SearchApiData | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const reset = () => {
    dispatch({ type: "reset", randomCuisine: initialMode === "random" });
    setStep(0);
    setDraft(null);
    setSearchResult(null);
    setIsSearching(false);
    setFormError(null);
  };

  const goBack = () => {
    setFormError(null);
    if (step === 0) {
      router.push("/");
      return;
    }
    setStep((current) => current - 1);
  };

  const runSearch = async (searchDraft: FoodSearchDraft) => {
    setFormError(null);
    try {
      setIsSearching(true);
      const result = await searchRestaurantPlaces(searchDraft);
      setSearchResult(result);
      setDraft(searchDraft);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Có một lựa chọn chưa hợp lệ. Hãy kiểm tra lại nhé.",
      );
    } finally {
      setIsSearching(false);
    }
  };

  const continueWizard = async () => {
    setFormError(null);
    if (!canContinueFromStep(step, state)) return;

    if (step < TOTAL_STEPS - 1) {
      setStep((current) => current + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    try {
      await runSearch(toFoodSearchDraft(state));
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Có một lựa chọn chưa hợp lệ. Hãy kiểm tra lại nhé.",
      );
    }
  };

  const relaxSearch = (suggestion: RelaxationSuggestion) => {
    if (!draft) return;
    const relaxedDraft = applySearchRelaxation(draft, suggestion);
    setDraft(relaxedDraft);

    if (suggestion.filter === "radiusMeters") {
      const distance = DISTANCE_OPTIONS.find(
        (option) => option.radiusMeters === suggestion.to,
      );
      if (distance) dispatch({ type: "set_distance", value: distance.id });
    } else if (suggestion.filter === "minRating") {
      const rating = RATING_OPTIONS.find((value) => value === suggestion.to);
      if (rating !== undefined) dispatch({ type: "set_rating", value: rating });
    } else {
      const reviewCount = REVIEW_OPTIONS.find((value) => value === suggestion.to);
      if (reviewCount !== undefined) {
        dispatch({ type: "set_review_count", value: reviewCount });
      }
    }

    void runSearch(relaxedDraft);
  };

  if (draft && searchResult) {
    return (
      <DiscoveryReady
        draft={draft}
        result={searchResult}
        isSearching={isSearching}
        error={formError}
        onEdit={() => {
          setDraft(null);
          setSearchResult(null);
          setFormError(null);
        }}
        onRelax={relaxSearch}
        onRetry={() => void runSearch(draft)}
      />
    );
  }

  return (
    <main className="px-4 pb-36">
      <WizardHeader
        currentStep={step}
        totalSteps={TOTAL_STEPS}
        onBack={goBack}
        onReset={reset}
      />

      <div key={step} className="animate-in fade-in slide-in-from-right-3 pt-5 duration-300">
        {step === 0 && (
          <CuisineStep
            selected={state.cuisines}
            onToggle={(value) => dispatch({ type: "toggle_cuisine", value })}
          />
        )}
        {step === 1 && (
          <MoodStep
            selected={state.moods}
            onToggle={(value) => dispatch({ type: "toggle_mood", value })}
          />
        )}
        {step === 2 && (
          <BudgetStep
            budgetId={state.budgetId}
            minRating={state.minRating}
            minReviewCount={state.minReviewCount}
            onBudgetChange={(value) => dispatch({ type: "set_budget", value })}
            onRatingChange={(value) => dispatch({ type: "set_rating", value })}
            onReviewCountChange={(value) =>
              dispatch({ type: "set_review_count", value })
            }
          />
        )}
        {step === 3 && (
          <LocationStep
            location={state.location}
            distanceId={state.distanceId}
            onLocationChange={(value) => dispatch({ type: "set_location", value })}
            onDistanceChange={(value) => dispatch({ type: "set_distance", value })}
          />
        )}
        {step === 4 && (
          <OptionsStep
            state={state}
            onToggle={(value) => dispatch({ type: "toggle_option", value })}
          />
        )}
      </div>

      {formError && (
        <p className="mt-5 text-center text-sm font-semibold text-destructive" role="alert">
          {formError}
        </p>
      )}

      <footer className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-30 mx-auto max-w-lg border-t border-border/70 bg-background/92 p-3 backdrop-blur-xl">
        <Button
          size="lg"
          className="w-full"
          onClick={() => void continueWizard()}
          disabled={!canContinueFromStep(step, state) || isSearching}
        >
          {isSearching ? (
            <>
              Đang tìm quán phù hợp…
              <LoaderCircle className="animate-spin" />
            </>
          ) : step === TOTAL_STEPS - 1 ? (
            <>
              Tìm quán cho tụi mình
              <Heart className="fill-current" />
            </>
          ) : (
            <>
              Tiếp tục
              <ChevronRight />
            </>
          )}
        </Button>
      </footer>
    </main>
  );
}
