"use client";

import { useEffect, useRef, useState } from "react";

import { getPlaceDetails } from "@/features/restaurant/api/get-place-details";
import type { PlaceDetails } from "@/types/place";

export function useLazyPlaceDetails(placeId: string) {
  const containerRef = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [place, setPlace] = useState<PlaceDetails>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    const element = containerRef.current;
    if (!element || visible) return;
    if (typeof IntersectionObserver === "undefined") {
      const frame = window.requestAnimationFrame(() => setVisible(true));
      return () => window.cancelAnimationFrame(frame);
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setVisible(true);
        observer.disconnect();
      },
      { rootMargin: "180px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible || place) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12_000);
    void getPlaceDetails(placeId, controller.signal)
      .then(setPlace)
      .catch((requestError: unknown) => {
        if (requestError instanceof Error && requestError.name === "AbortError") {
          setError("Tải thông tin quán hơi lâu.");
          return;
        }
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Chưa tải được thông tin quán.",
        );
      })
      .finally(() => window.clearTimeout(timeout));
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [place, placeId, visible]);

  return { containerRef, place, error, loading: visible && !place && !error };
}
