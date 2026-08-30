"use client";

import { ArrowLeft, CalendarHeart, LoaderCircle, RefreshCcw } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  deleteHistoryRecord,
  getHistory,
} from "@/features/saved/api/owned-data";
import { HistoryPlaceItem } from "@/features/saved/components/history-place-item";
import type { PlaceHistoryRecord } from "@/types/saved";

export function HistoryDashboard() {
  const [visits, setVisits] = useState<PlaceHistoryRecord[]>([]);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12_000);
    void getHistory(controller.signal)
      .then((payload) => setVisits(payload.visits))
      .catch((requestError: unknown) =>
        setError(
          requestError instanceof Error && requestError.name !== "AbortError"
            ? requestError.message
            : "Tải lịch sử hơi lâu. Hãy thử lại.",
        ),
      )
      .finally(() => {
        window.clearTimeout(timeout);
        setLoading(false);
      });
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [reloadKey]);

  const remove = async (record: PlaceHistoryRecord) => {
    const previous = visits;
    setBusyIds((current) => new Set(current).add(record.id));
    setVisits((current) => current.filter((visit) => visit.id !== record.id));
    const controller = new AbortController();
    try {
      await deleteHistoryRecord(record.id, controller.signal);
    } catch (requestError) {
      setVisits(previous);
      setError(requestError instanceof Error ? requestError.message : "Chưa xóa được lần ghé.");
    } finally {
      setBusyIds((current) => {
        const next = new Set(current);
        next.delete(record.id);
        return next;
      });
    }
  };

  return (
    <main className="px-4 pb-8 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <Button asChild variant="ghost" size="sm">
        <Link href="/saved">
          <ArrowLeft /> Đã lưu
        </Link>
      </Button>
      <header className="mt-4">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
          Kỷ niệm của bạn
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-[-0.04em]">
          Những nơi mình đã đi ❤️
        </h1>
      </header>

      {error && (
        <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-xs font-semibold text-red-700" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <div className="grid min-h-64 place-items-center">
          <LoaderCircle className="size-7 animate-spin text-primary" />
        </div>
      ) : visits.length > 0 ? (
        <section className="mt-6" aria-label="Timeline các nơi đã đi">
          {visits.map((record) => (
            <HistoryPlaceItem
              key={record.id}
              record={record}
              busy={busyIds.has(record.id)}
              onDelete={() => void remove(record)}
            />
          ))}
        </section>
      ) : (
        <Card className="mt-7 border-dashed bg-transparent">
          <CardContent className="py-12 text-center">
            <CalendarHeart className="mx-auto size-9 text-primary" />
            <h2 className="mt-4 text-xl font-black">Chưa có kỷ niệm nào</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Mở trang chi tiết quán và chọn “Đã ghé quán” để thêm vào timeline.
            </p>
          </CardContent>
        </Card>
      )}

      {!loading && error && (
        <Button
          className="mt-4 w-full"
          variant="outline"
          onClick={() => {
            setLoading(true);
            setError(undefined);
            setReloadKey((value) => value + 1);
          }}
        >
          <RefreshCcw /> Tải lại
        </Button>
      )}
    </main>
  );
}
