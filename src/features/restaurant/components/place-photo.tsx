"use client";

import { ExternalLink, ImageOff } from "lucide-react";
import { Fragment, useEffect, useRef, useState } from "react";

import { getPlacePhoto } from "@/features/restaurant/api/get-place-photo";
import {
  buildGoogleMapsPlaceUrl,
  safeExternalUrl,
} from "@/features/restaurant/place-formatters";
import { cn } from "@/lib/utils";
import type { PlacePhoto as PlacePhotoData } from "@/types/place";

type PlacePhotoProps = {
  placeId: string;
  photo?: PlacePhotoData;
  placeName: string;
  className?: string;
};

function PlacePhotoContent({
  placeId,
  photo,
  placeName,
  className,
}: PlacePhotoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const requestedRef = useRef(false);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [photoAsset, setPhotoAsset] = useState<{
    photoUri: string;
    photo?: PlacePhotoData;
  }>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const element = containerRef.current;
    if (!element || requestedRef.current) return;

    if (typeof IntersectionObserver === "undefined") {
      requestedRef.current = true;
      const frame = window.requestAnimationFrame(() => setShouldLoad(true));
      return () => window.cancelAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        requestedRef.current = true;
        setShouldLoad(true);
        observer.disconnect();
      },
      { threshold: 0.01 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [photo, placeId]);

  useEffect(() => {
    if (!shouldLoad) return;
    const controller = new AbortController();

    void getPlacePhoto(
      photo
        ? { resourceName: photo.resourceName, maxWidthPx: 800 }
        : { placeId, maxWidthPx: 800 },
      controller.signal,
    )
      .then(setPhotoAsset)
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === "AbortError") return;
        setFailed(true);
      });

    return () => controller.abort();
  }, [photo, placeId, shouldLoad]);

  const resolvedPhoto = photo ?? photoAsset?.photo;
  const photoUri = photoAsset?.photoUri;
  const sourceUrl = safeExternalUrl(resolvedPhoto?.googleMapsUri);
  const authors = resolvedPhoto?.authorAttributions ?? [];
  const fallbackMapsUrl = buildGoogleMapsPlaceUrl(placeId, placeName);

  return (
    <div
      ref={containerRef}
      className={cn("relative aspect-[4/3] overflow-hidden bg-secondary", className)}
    >
      {photoUri && !failed ? (
        // A plain lazy image avoids the Next.js optimizer cache for Places Content.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUri}
          alt={`Ảnh ${placeName}`}
          className="size-full object-cover"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : failed ? (
        <a
          href={fallbackMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group grid size-full place-items-center bg-[radial-gradient(circle_at_18%_20%,color-mix(in_oklab,var(--color-accent)_75%,white),transparent_34%),radial-gradient(circle_at_82%_75%,color-mix(in_oklab,var(--color-primary)_16%,transparent),transparent_42%),linear-gradient(145deg,var(--color-secondary),var(--color-background))] px-6 text-center text-foreground"
          aria-label={`Google chưa cung cấp ảnh ${placeName}. Mở địa điểm trên Google Maps để xem ảnh`}
        >
          <span className="flex max-w-64 flex-col items-center gap-2.5">
            <span className="grid size-11 place-items-center rounded-full border border-primary/15 bg-background/80 text-primary shadow-sm backdrop-blur">
              <ImageOff className="size-5" />
            </span>
            <span className="line-clamp-2 text-base font-black leading-tight">
              {placeName}
            </span>
            <span className="text-xs font-medium text-muted-foreground">
              Google Places chưa cung cấp ảnh cho app
            </span>
            <span className="mt-0.5 inline-flex items-center gap-1.5 rounded-full bg-background/90 px-3 py-2 text-xs font-bold text-primary shadow-sm transition-transform group-hover:-translate-y-0.5">
              Xem ảnh thật trên Google Maps
              <ExternalLink className="size-3.5" />
            </span>
          </span>
        </a>
      ) : (
        <div className="size-full animate-pulse bg-gradient-to-br from-secondary via-muted to-accent/60" />
      )}

      {photoUri && !failed && (authors.length > 0 || sourceUrl) && (
        <div className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-2 rounded-xl bg-black/65 px-2.5 py-1.5 text-[10px] text-white backdrop-blur-sm">
          {authors.length > 0 ? (
            <span className="min-w-0 truncate">
              Ảnh:{" "}
              {authors.map((author, index) => {
                const authorUrl = safeExternalUrl(author.uri);
                return (
                  <Fragment key={`${author.displayName}-${index}`}>
                    {index > 0 && ", "}
                    {authorUrl ? (
                      <a
                        href={authorUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline decoration-white/60 underline-offset-2"
                      >
                        {author.displayName}
                      </a>
                    ) : (
                      author.displayName
                    )}
                  </Fragment>
                );
              })}
            </span>
          ) : (
            <span />
          )}
          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex shrink-0 items-center gap-1 font-semibold"
              aria-label="Xem ảnh nguồn trên Google Maps"
            >
              Nguồn ảnh
              <ExternalLink className="size-3" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export function PlacePhoto(props: PlacePhotoProps) {
  return (
    <PlacePhotoContent
      key={props.photo?.resourceName ?? props.placeId}
      {...props}
    />
  );
}
