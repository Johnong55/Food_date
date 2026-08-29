"use client";

import { ExternalLink, ImageOff } from "lucide-react";
import { Fragment, useEffect, useRef, useState } from "react";

import { getPlacePhoto } from "@/features/restaurant/api/get-place-photo";
import { safeExternalUrl } from "@/features/restaurant/place-formatters";
import { cn } from "@/lib/utils";
import type { PlacePhoto as PlacePhotoData } from "@/types/place";

type PlacePhotoProps = {
  photo?: PlacePhotoData;
  placeName: string;
  className?: string;
};

export function PlacePhoto({ photo, placeName, className }: PlacePhotoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const requestedRef = useRef(false);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [photoUri, setPhotoUri] = useState<string>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const element = containerRef.current;
    if (!element || !photo || requestedRef.current) return;

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
  }, [photo]);

  useEffect(() => {
    if (!shouldLoad || !photo) return;
    const controller = new AbortController();

    void getPlacePhoto(
      { resourceName: photo.resourceName, maxWidthPx: 800 },
      controller.signal,
    )
      .then(setPhotoUri)
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === "AbortError") return;
        setFailed(true);
      });

    return () => controller.abort();
  }, [photo, shouldLoad]);

  const sourceUrl = safeExternalUrl(photo?.googleMapsUri);
  const authors = photo?.authorAttributions ?? [];

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
      ) : failed || !photo ? (
        <div className="grid size-full place-items-center bg-[radial-gradient(circle_at_top_right,var(--color-accent),var(--color-secondary))] text-muted-foreground">
          <span className="flex flex-col items-center gap-2 text-xs font-semibold">
            <ImageOff className="size-6" />
            Chưa có ảnh
          </span>
        </div>
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
