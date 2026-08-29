"use client";

import { ArrowLeft, RefreshCcw } from "lucide-react";
import type { Route } from "next";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { getMenu, resolveMenu } from "@/features/menu/api/get-menu";
import { MenuFallback } from "@/features/menu/components/menu-fallback";
import { MenuView } from "@/features/menu/components/menu-view";
import { GoogleMapsAttribution } from "@/features/restaurant/components/google-maps-attribution";
import type { MenuApiData } from "@/types/menu";

type MenuPageProps = {
  placeId: string;
};

function MenuLoading() {
  return (
    <div className="animate-pulse space-y-4 pt-3" aria-label="Đang tải menu">
      <div className="h-8 w-2/3 rounded-xl bg-muted" />
      <div className="h-12 rounded-2xl bg-muted" />
      <div className="h-11 w-full rounded-full bg-muted" />
      <div className="h-60 rounded-3xl bg-muted" />
    </div>
  );
}

export function MenuPage({ placeId }: MenuPageProps) {
  const router = useRouter();
  const resolveController = useRef<AbortController | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [data, setData] = useState<MenuApiData>();
  const [error, setError] = useState<string>();
  const [resolveError, setResolveError] = useState<string>();
  const [resolving, setResolving] = useState(false);
  const [communityMessage, setCommunityMessage] = useState<string>();

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12_000);
    let active = true;

    void getMenu(placeId, controller.signal)
      .then((result) => {
        if (active) setData(result);
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        setError(
          requestError instanceof Error && requestError.name !== "AbortError"
            ? requestError.message
            : "Tải menu hơi lâu. Hãy thử lại nhé.",
        );
      })
      .finally(() => window.clearTimeout(timeout));

    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
      resolveController.current?.abort();
    };
  }, [placeId, reloadKey]);

  const goBack = () => {
    if (window.history.length > 1) router.back();
    else router.push(`/restaurant/${encodeURIComponent(placeId)}` as Route);
  };

  const findOfficialMenu = async () => {
    resolveController.current?.abort();
    const controller = new AbortController();
    resolveController.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 22_000);
    setResolving(true);
    setResolveError(undefined);

    try {
      const result = await resolveMenu(placeId, controller.signal);
      setData((current) => ({
        ...result,
        place: result.place ?? current?.place,
      }));
    } catch (requestError) {
      setResolveError(
        requestError instanceof Error && requestError.name !== "AbortError"
          ? requestError.message
          : "Kiểm tra website hơi lâu. Hãy thử lại sau.",
      );
    } finally {
      window.clearTimeout(timeout);
      setResolving(false);
    }
  };

  return (
    <main className="px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))]">
      <Button
        variant="outline"
        size="icon"
        onClick={goBack}
        aria-label="Quay lại chi tiết quán"
      >
        <ArrowLeft />
      </Button>

      <div className="mt-5">
        {error ? (
          <section className="py-20 text-center">
            <h1 className="text-2xl font-black">Chưa tải được menu</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground" role="alert">
              {error}
            </p>
            <Button
              className="mt-5"
              onClick={() => {
                setError(undefined);
                setData(undefined);
                setReloadKey((value) => value + 1);
              }}
            >
              <RefreshCcw /> Thử lại
            </Button>
          </section>
        ) : !data ? (
          <MenuLoading />
        ) : data.resolution.status === "resolved" ? (
          <>
            <MenuView
              menu={data.resolution.menu}
              placeName={data.place?.displayName}
            />
            {data.place && <GoogleMapsAttribution className="mt-5" />}
          </>
        ) : (
          <MenuFallback
            data={data}
            resolving={resolving}
            resolveError={resolveError}
            onResolve={() => void findOfficialMenu()}
            onCommunityUpload={() =>
              setCommunityMessage(
                "Upload ảnh/PDF và OCR sẽ được mở ở phase Community Menu sau MVP.",
              )
            }
          />
        )}
      </div>

      {communityMessage && (
        <div
          className="fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40 mx-auto max-w-md rounded-2xl bg-foreground px-4 py-3 text-center text-xs font-semibold leading-5 text-background shadow-xl"
          role="status"
          onClick={() => setCommunityMessage(undefined)}
        >
          {communityMessage}
        </div>
      )}
    </main>
  );
}
