"use client";

import type { Route } from "next";
import {
  CalendarHeart,
  FolderHeart,
  LoaderCircle,
  Plus,
  RefreshCcw,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  createCollection,
  deleteCollection,
  deleteSavedPlace,
  getSavedPlaces,
  moveSavedPlace,
} from "@/features/saved/api/owned-data";
import { SavedPlaceItem } from "@/features/saved/components/saved-place-item";
import { cn } from "@/lib/utils";
import type { SavedCollection, SavedPlaceRecord } from "@/types/saved";

export function SavedDashboard() {
  const [places, setPlaces] = useState<SavedPlaceRecord[]>([]);
  const [collections, setCollections] = useState<SavedCollection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string | "all">("all");
  const [newCollection, setNewCollection] = useState("");
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12_000);
    void getSavedPlaces(controller.signal)
      .then((payload) => {
        setPlaces(payload.places);
        setCollections(payload.collections);
      })
      .catch((requestError: unknown) => {
        setError(
          requestError instanceof Error && requestError.name !== "AbortError"
            ? requestError.message
            : "Tải danh sách hơi lâu. Hãy thử lại.",
        );
      })
      .finally(() => {
        window.clearTimeout(timeout);
        setLoading(false);
      });
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [reloadKey]);

  const filteredPlaces = useMemo(
    () =>
      selectedCollection === "all"
        ? places
        : places.filter(
            (place) => (place.collectionId ?? "unfiled") === selectedCollection,
          ),
    [places, selectedCollection],
  );

  const markBusy = (id: string, busy: boolean) => {
    setBusyIds((current) => {
      const next = new Set(current);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const move = async (record: SavedPlaceRecord, collectionId: string | null) => {
    const previous = places;
    markBusy(record.id, true);
    setPlaces((current) =>
      current.map((place) =>
        place.id === record.id ? { ...place, collectionId } : place,
      ),
    );
    const controller = new AbortController();
    try {
      const result = await moveSavedPlace(
        record.id,
        { collectionId },
        controller.signal,
      );
      setPlaces((current) => [
        result,
        ...current.filter(
          (place) => place.id !== record.id && place.id !== result.id,
        ),
      ]);
    } catch (requestError) {
      setPlaces(previous);
      setError(requestError instanceof Error ? requestError.message : "Chưa chuyển được quán.");
    } finally {
      markBusy(record.id, false);
    }
  };

  const removePlace = async (record: SavedPlaceRecord) => {
    const previous = places;
    markBusy(record.id, true);
    setPlaces((current) => current.filter((place) => place.id !== record.id));
    const controller = new AbortController();
    try {
      await deleteSavedPlace(record.id, controller.signal);
    } catch (requestError) {
      setPlaces(previous);
      setError(requestError instanceof Error ? requestError.message : "Chưa xóa được quán.");
    } finally {
      markBusy(record.id, false);
    }
  };

  const addCollection = async () => {
    const name = newCollection.trim();
    if (!name || creating) return;
    const controller = new AbortController();
    setCreating(true);
    setError(undefined);
    try {
      const collection = await createCollection(name, controller.signal);
      setCollections((current) =>
        [...current, collection].sort((left, right) =>
          left.name.localeCompare(right.name, "vi"),
        ),
      );
      setSelectedCollection(collection.id);
      setNewCollection("");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Chưa tạo được bộ sưu tập.",
      );
    } finally {
      setCreating(false);
    }
  };

  const removeCollection = async (collection: SavedCollection) => {
    const previousCollections = collections;
    const previousPlaces = places;
    setCollections((current) => current.filter((item) => item.id !== collection.id));
    setPlaces((current) =>
      current.map((place) =>
        place.collectionId === collection.id
          ? { ...place, collectionId: null }
          : place,
      ),
    );
    setSelectedCollection("all");
    const controller = new AbortController();
    try {
      await deleteCollection(collection.id, controller.signal);
    } catch (requestError) {
      setCollections(previousCollections);
      setPlaces(previousPlaces);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Chưa xóa được bộ sưu tập.",
      );
    }
  };

  return (
    <main className="px-4 pb-8 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
            Bộ sưu tập
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-[-0.04em]">Quán muốn thử</h1>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={"/history" as Route}>
            <CalendarHeart /> Đã đi
          </Link>
        </Button>
      </header>

      <Card className="mt-5 border-primary/15">
        <CardContent className="p-4">
          <label className="text-xs font-bold">Tạo collection mới</label>
          <div className="mt-2 flex gap-2">
            <input
              value={newCollection}
              maxLength={60}
              onChange={(event) => setNewCollection(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void addCollection();
              }}
              placeholder="Date night, Cafe chill…"
              className="min-h-11 min-w-0 flex-1 rounded-xl border bg-background px-3 text-sm"
            />
            <Button size="icon" disabled={!newCollection.trim() || creating} onClick={() => void addCollection()}>
              {creating ? <LoaderCircle className="animate-spin" /> : <Plus />}
              <span className="sr-only">Tạo collection</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-2" aria-label="Lọc collection">
        <button
          type="button"
          onClick={() => setSelectedCollection("all")}
          className={cn(
            "min-h-10 shrink-0 rounded-full px-4 text-xs font-bold",
            selectedCollection === "all" ? "bg-primary text-primary-foreground" : "bg-secondary",
          )}
        >
          Tất cả · {places.length}
        </button>
        <button
          type="button"
          onClick={() => setSelectedCollection("unfiled")}
          className={cn(
            "min-h-10 shrink-0 rounded-full px-4 text-xs font-bold",
            selectedCollection === "unfiled" ? "bg-primary text-primary-foreground" : "bg-secondary",
          )}
        >
          Chưa phân loại
        </button>
        {collections.map((collection) => (
          <button
            key={collection.id}
            type="button"
            onClick={() => setSelectedCollection(collection.id)}
            className={cn(
              "min-h-10 shrink-0 rounded-full px-4 text-xs font-bold",
              selectedCollection === collection.id
                ? "bg-primary text-primary-foreground"
                : "bg-secondary",
            )}
          >
            {collection.name}
          </button>
        ))}
      </div>

      {selectedCollection !== "all" && selectedCollection !== "unfiled" && (
        <div className="mt-1 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="text-red-700"
            onClick={() => {
              const collection = collections.find((item) => item.id === selectedCollection);
              if (collection) void removeCollection(collection);
            }}
          >
            <Trash2 /> Xóa collection
          </Button>
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-xs font-semibold text-red-700" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <div className="mt-6 grid min-h-48 place-items-center">
          <LoaderCircle className="size-7 animate-spin text-primary" />
        </div>
      ) : filteredPlaces.length > 0 ? (
        <section className="mt-5 space-y-4" aria-label="Các quán đã lưu">
          {filteredPlaces.map((record) => (
            <SavedPlaceItem
              key={record.id}
              record={record}
              collections={collections}
              busy={busyIds.has(record.id)}
              onMove={(collectionId) => void move(record, collectionId)}
              onDelete={() => void removePlace(record)}
            />
          ))}
        </section>
      ) : (
        <Card className="mt-6 border-dashed bg-transparent">
          <CardContent className="py-10 text-center">
            <FolderHeart className="mx-auto size-8 text-primary" />
            <h2 className="mt-3 text-lg font-black">Collection này còn trống</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Nhấn “Lưu quán” từ kết quả hoặc trang chi tiết để thêm địa điểm.
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
