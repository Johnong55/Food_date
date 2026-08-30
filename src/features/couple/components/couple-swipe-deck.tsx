"use client";

import { AlertTriangle, Heart, LoaderCircle, RefreshCcw, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  createCoupleSwipeDeck,
  getCoupleMatches,
  saveCoupleSwipe,
} from "@/features/couple/api/couple-session";
import { CoupleMatchCelebration } from "@/features/couple/components/couple-match-celebration";
import { CoupleSwipeCard } from "@/features/couple/components/couple-swipe-card";
import type { CoupleSwipeDeck as CoupleSwipeDeckData, SwipeDecision } from "@/types/couple";
import type { PlaceSummary } from "@/types/place";

const REQUEST_TIMEOUT_MS = 15_000;

export function CoupleSwipeDeck({ code }: { code: string }) {
  const [started, setStarted] = useState(false);
  const [deck, setDeck] = useState<CoupleSwipeDeckData>();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [matchPlace, setMatchPlace] = useState<PlaceSummary>();
  const [announcedMatches, setAnnouncedMatches] = useState<Set<string>>(new Set());

  const currentPlace = useMemo(
    () => deck?.places.find((place) => !deck.ownDecisions[place.id]),
    [deck],
  );

  const loadDeck = async () => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    setStarted(true);
    setLoading(true);
    setError(undefined);
    try {
      const result = await createCoupleSwipeDeck(code, controller.signal);
      setDeck(result);
      setAnnouncedMatches(new Set(result.matchedPlaceIds));
    } catch (requestError) {
      setError(
        requestError instanceof Error && requestError.name !== "AbortError"
          ? requestError.message
          : "Tạo bộ quán hơi lâu. Hãy thử lại.",
      );
    } finally {
      window.clearTimeout(timeout);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!deck || deck.ownSwipeCount === 0) return;
    const controllers = new Set<AbortController>();
    const interval = window.setInterval(() => {
      const controller = new AbortController();
      controllers.add(controller);
      void getCoupleMatches(code, controller.signal)
        .then((state) => {
          setDeck((current) =>
            current
              ? { ...current, matchedPlaceIds: state.matchedPlaceIds }
              : current,
          );
          const freshMatch = state.matchedPlaceIds.find(
            (placeId) => !announcedMatches.has(placeId),
          );
          if (!freshMatch) return;
          const place = deck.places.find((candidate) => candidate.id === freshMatch);
          if (place) setMatchPlace(place);
          setAnnouncedMatches((current) => new Set(current).add(freshMatch));
        })
        .catch(() => undefined)
        .finally(() => controllers.delete(controller));
    }, 5_000);
    return () => {
      window.clearInterval(interval);
      controllers.forEach((controller) => controller.abort());
    };
  }, [announcedMatches, code, deck]);

  const decide = async (decision: SwipeDecision) => {
    if (!currentPlace || !deck || saving) return;
    const place = currentPlace;
    const previousDecision = deck.ownDecisions[place.id];
    setSaving(true);
    setError(undefined);
    setDeck({
      ...deck,
      ownSwipeCount: previousDecision ? deck.ownSwipeCount : deck.ownSwipeCount + 1,
      ownDecisions: { ...deck.ownDecisions, [place.id]: decision },
    });

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const result = await saveCoupleSwipe(
        code,
        { googlePlaceId: place.id, decision },
        controller.signal,
      );
      setDeck((current) =>
        current
          ? {
              ...current,
              candidateIds: result.candidateIds,
              candidateCount: result.candidateCount,
              ownSwipeCount: result.ownSwipeCount,
              ownDecisions: result.ownDecisions,
              matchedPlaceIds: result.matchedPlaceIds,
            }
          : current,
      );
      if (result.matched) {
        setMatchPlace(place);
        setAnnouncedMatches((current) => new Set(current).add(place.id));
      }
    } catch (requestError) {
      setDeck((current) => {
        if (!current) return current;
        const ownDecisions = { ...current.ownDecisions };
        if (previousDecision) ownDecisions[place.id] = previousDecision;
        else delete ownDecisions[place.id];
        return {
          ...current,
          ownSwipeCount: previousDecision
            ? current.ownSwipeCount
            : Math.max(0, current.ownSwipeCount - 1),
          ownDecisions,
        };
      });
      setError(
        requestError instanceof Error && requestError.name !== "AbortError"
          ? requestError.message
          : "Lưu lượt vuốt hơi lâu. Lựa chọn đã được hoàn tác.",
      );
    } finally {
      window.clearTimeout(timeout);
      setSaving(false);
    }
  };

  if (!started) {
    return (
      <Card className="mt-4 border-primary/20 bg-primary/5">
        <CardContent className="py-6 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-primary text-primary-foreground">
            <Heart className="size-6 fill-current" />
          </span>
          <h3 className="mt-4 text-xl font-black">Sẵn sàng swipe kín?</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Tạo tối đa 10 quán theo thứ tự Google. Người ấy sẽ không thấy lựa chọn của bạn trước khi match.
          </p>
          <Button className="mt-4 w-full" size="lg" onClick={() => void loadDeck()}>
            <Sparkles /> Tạo bộ quán chung
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="mt-4">
        <CardContent className="grid min-h-64 place-items-center text-center">
          <div>
            <LoaderCircle className="mx-auto size-7 animate-spin text-primary" />
            <p className="mt-3 text-sm font-bold">Đang tìm bộ quán chung…</p>
            <p className="mt-1 text-xs text-muted-foreground">Giữ nguyên hard filters của hai bạn.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!deck) {
    return (
      <Card className="mt-4 border-amber-200 bg-amber-50">
        <CardContent className="py-6 text-center text-amber-900">
          <AlertTriangle className="mx-auto size-6" />
          <p className="mt-3 text-sm font-bold" role="alert">{error ?? "Chưa tạo được bộ quán."}</p>
          <Button className="mt-4" variant="outline" onClick={() => void loadDeck()}>
            <RefreshCcw /> Thử lại
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="mt-5" aria-label="Swipe quán cùng nhau">
      <div className="mb-3 flex items-center justify-between gap-3 text-xs font-bold text-muted-foreground">
        <span>{deck.ownSwipeCount}/{deck.candidateCount} đã vuốt</span>
        <span>{deck.matchedPlaceIds.length} match</span>
      </div>

      <div className="mb-4 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width]"
          style={{
            width: `${deck.candidateCount > 0 ? (deck.ownSwipeCount / deck.candidateCount) * 100 : 0}%`,
          }}
        />
      </div>

      {currentPlace ? (
        <CoupleSwipeCard
          place={currentPlace}
          busy={saving}
          onDecision={(decision) => void decide(decision)}
        />
      ) : (
        <Card>
          <CardContent className="py-9 text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-secondary text-primary">
              <Heart className="size-6" />
            </span>
            <h3 className="mt-4 text-xl font-black">Bạn đã vuốt hết bộ quán</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Lựa chọn vẫn được giữ kín. Trang này sẽ tự kiểm tra khi người ấy hoàn tất.
            </p>
          </CardContent>
        </Card>
      )}

      <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-semibold leading-5 text-amber-800">
        Ngân sách VND chưa thể xác minh chính xác từ Google Places. Hãy xem menu trước khi chốt; app không tự nới mức tối đa của hai bạn.
      </p>
      {error && (
        <p className="mt-3 text-center text-xs font-semibold text-red-700" role="alert">
          {error}
        </p>
      )}

      {matchPlace && (
        <CoupleMatchCelebration
          place={matchPlace}
          onContinue={() => setMatchPlace(undefined)}
        />
      )}
    </section>
  );
}
