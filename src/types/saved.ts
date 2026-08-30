export type SavedCollection = {
  id: string;
  name: string;
  createdAt: string;
};

export type SavedPlaceRecord = {
  id: string;
  googlePlaceId: string;
  collectionId: string | null;
  createdAt: string;
};

export type PlaceHistoryRecord = {
  id: string;
  googlePlaceId: string;
  personalRating: number | null;
  note: string | null;
  visitedAt: string;
  approximateCost: number | null;
  currency: "VND";
  createdAt: string;
};
