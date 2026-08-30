"use client";

import { CalendarHeart, LoaderCircle, LogIn, Star, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  createHistoryRecord,
  OwnedDataApiError,
} from "@/features/saved/api/owned-data";

function todayInputValue() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function VisitPlaceButton({
  placeId,
  placeName,
}: {
  placeId: string;
  placeName: string;
}) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [visitedDate, setVisitedDate] = useState(todayInputValue);
  const [cost, setCost] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [error, setError] = useState<string>();

  const submit = async () => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12_000);
    setSaving(true);
    setSaved(true);
    setError(undefined);
    try {
      await createHistoryRecord(
        {
          googlePlaceId: placeId,
          personalRating: rating,
          note: note.trim() || null,
          visitedAt: new Date(`${visitedDate}T12:00:00+07:00`).toISOString(),
          approximateCost: cost ? Number(cost) : null,
          currency: "VND",
        },
        controller.signal,
      );
      setOpen(false);
    } catch (requestError) {
      setSaved(false);
      if (
        requestError instanceof OwnedDataApiError &&
        requestError.code === "AUTH_REQUIRED"
      ) {
        setAuthRequired(true);
      } else {
        setError(
          requestError instanceof Error && requestError.name !== "AbortError"
            ? requestError.message
            : "Lưu lịch sử hơi lâu. Hãy thử lại.",
        );
      }
    } finally {
      window.clearTimeout(timeout);
      setSaving(false);
    }
  };

  if (authRequired) {
    return (
      <Button asChild variant="outline">
        <Link href="/profile">
          <LogIn /> Đăng nhập để lưu lịch sử
        </Link>
      </Button>
    );
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} disabled={saved}>
        <CalendarHeart /> {saved ? "Đã thêm lịch sử" : "Đã ghé quán"}
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/45 backdrop-blur-sm">
          <section
            className="animate-in slide-in-from-bottom w-full max-w-lg rounded-t-[2rem] bg-background px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="visit-place-title"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-primary">NHỮNG NƠI MÌNH ĐÃ ĐI ❤️</p>
                <h2 id="visit-place-title" className="mt-1 text-xl font-black">
                  {placeName}
                </h2>
              </div>
              <Button size="icon" variant="ghost" onClick={() => setOpen(false)}>
                <X />
                <span className="sr-only">Đóng</span>
              </Button>
            </div>

            <fieldset className="mt-5">
              <legend className="text-xs font-bold">Đánh giá của bạn</legend>
              <div className="mt-2 flex gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    className="grid size-11 place-items-center rounded-xl bg-secondary"
                    onClick={() => setRating(value)}
                    aria-label={`${value} sao`}
                    aria-pressed={value <= rating}
                  >
                    <Star
                      className={
                        value <= rating
                          ? "size-5 fill-amber-400 text-amber-500"
                          : "size-5 text-muted-foreground"
                      }
                    />
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="text-xs font-bold">
                Ngày đã đi
                <input
                  type="date"
                  value={visitedDate}
                  max={todayInputValue()}
                  onChange={(event) => setVisitedDate(event.target.value)}
                  className="mt-2 min-h-11 w-full rounded-xl border bg-background px-3 text-sm"
                />
              </label>
              <label className="text-xs font-bold">
                Chi phí khoảng
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="1000000000"
                  step="10000"
                  value={cost}
                  onChange={(event) => setCost(event.target.value)}
                  placeholder="500000"
                  className="mt-2 min-h-11 w-full rounded-xl border bg-background px-3 text-sm"
                />
              </label>
            </div>

            <label className="mt-4 block text-xs font-bold">
              Ghi chú
              <textarea
                value={note}
                maxLength={2_000}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Món ngon nhất, kỷ niệm hôm đó…"
                className="mt-2 min-h-24 w-full resize-none rounded-2xl border bg-background p-3 text-sm"
              />
            </label>

            {error && (
              <p className="mt-3 text-xs font-semibold text-red-700" role="alert">
                {error}
              </p>
            )}
            <Button
              className="mt-5 w-full"
              size="lg"
              disabled={saving || !visitedDate || (cost !== "" && !Number.isFinite(Number(cost)))}
              onClick={() => void submit()}
            >
              {saving ? <LoaderCircle className="animate-spin" /> : <CalendarHeart />}
              {saving ? "Đang lưu…" : "Thêm vào lịch sử"}
            </Button>
          </section>
        </div>
      )}
    </>
  );
}
