import type {
  FoodPreferenceState,
  PreferenceAction,
} from "@/features/discovery/types";

const MAX_CUISINES = 3;
const MAX_MOODS = 4;

function toggleLimited<T>(items: T[], value: T, maximum: number) {
  if (items.includes(value)) return items.filter((item) => item !== value);
  if (items.length >= maximum) return items;
  return [...items, value];
}

export function createInitialPreferences(randomCuisine = false): FoodPreferenceState {
  return {
    cuisines: randomCuisine ? ["random"] : [],
    moods: [],
    budgetId: null,
    distanceId: "3km",
    minRating: 4,
    minReviewCount: 50,
    options: ["open_now"],
    location: null,
  };
}

export function preferenceReducer(
  state: FoodPreferenceState,
  action: PreferenceAction,
): FoodPreferenceState {
  switch (action.type) {
    case "toggle_cuisine": {
      if (action.value === "random") {
        return {
          ...state,
          cuisines: state.cuisines.includes("random") ? [] : ["random"],
        };
      }

      const current = state.cuisines.filter((cuisine) => cuisine !== "random");
      return {
        ...state,
        cuisines: toggleLimited(current, action.value, MAX_CUISINES),
      };
    }
    case "toggle_mood":
      return {
        ...state,
        moods: toggleLimited(state.moods, action.value, MAX_MOODS),
      };
    case "set_budget":
      return { ...state, budgetId: action.value };
    case "set_distance":
      return { ...state, distanceId: action.value };
    case "set_rating":
      return { ...state, minRating: action.value };
    case "set_review_count":
      return { ...state, minReviewCount: action.value };
    case "toggle_option":
      return {
        ...state,
        options: toggleLimited(state.options, action.value, Number.POSITIVE_INFINITY),
      };
    case "set_location":
      return { ...state, location: action.value };
    case "reset":
      return createInitialPreferences(action.randomCuisine);
  }
}

export function canContinueFromStep(step: number, state: FoodPreferenceState) {
  switch (step) {
    case 0:
      return state.cuisines.length > 0;
    case 1:
      return state.moods.length > 0;
    case 2:
      return state.budgetId !== null;
    case 3:
      return state.location !== null;
    case 4:
      return true;
    default:
      return false;
  }
}
