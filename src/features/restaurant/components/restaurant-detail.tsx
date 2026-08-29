"use client";

import {
  ArrowLeft,
  BookOpen,
  Check,
  Clock3,
  ExternalLink,
  Globe2,
  LoaderCircle,
  MapPin,
  Navigation,
  RefreshCcw,
  Send,
  Sparkles,
  Star,
} from "lucide-react";
import type { Route } from "next";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getPlaceDetails } from "@/features/restaurant/api/get-place-details";
import { GoogleMapsAttribution } from "@/features/restaurant/components/google-maps-attribution";
import { PlacePhoto } from "@/features/restaurant/components/place-photo";
import { PlaceReviews } from "@/features/restaurant/components/place-reviews";
import { RestaurantDetailSkeleton } from "@/features/restaurant/components/restaurant-detail-skeleton";
import {
  buildGoogleMapsDirectionsUrl,
  formatVerifiedPriceRange,
  getAvailableFeatureLabels,
} from "@/features/restaurant/detail-formatters";
import { usePlaceDistance } from "@/features/restaurant/hooks/use-place-distance";
import {
  buildGoogleMapsUrl,
  formatDistance,
  formatPlaceType,
  formatPriceLevel,
  formatReviewCount,
  getPlaceTags,
  safeExternalUrl,
} from "@/features/restaurant/place-formatters";
import { cn } from "@/lib/utils";
import type { PlaceDetails } from "@/types/place";

type RestaurantDetailProps = {
  placeId: string;
};

function DetailError({ message, onRetry }: { message: string; onRetry: () => void }) {
  const router = useRouter();
  const goBack = () => {
    if (window.history.length > 1) router.back();
    else router.push("/explore?intent=food");
  };

  return (
    <main className="grid min-h-[calc(100svh-5rem)] place-items-center px-5 pb-24 text-center">
      <section className="max-w-sm">
        <span className="mx-auto grid size-20 place-items-center rounded-[1.75rem] bg-secondary text-primary">
          <RefreshCcw className="size-8" />
        </span>
        <h1 className="mt-6 text-2xl font-black">Chưa mở được thông tin quán</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground" role="alert">
          {message}
        </p>
        <div className="mt-6 grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={goBack}>
            <ArrowLeft />
            Quay lại
          </Button>
          <Button onClick={onRetry}>
            <RefreshCcw />
            Thử lại
          </Button>
        </div>
      </section>
    </main>
  );
}

function DetailContent({ place }: { place: PlaceDetails }) {
  const router = useRouter();
  const [selected, setSelected] = useState(false);
  const [shareStatus, setShareStatus] = useState<string>();
  const {
    calculateDistance,
    distanceMeters,
    isLocating,
    error: distanceError,
  } = usePlaceDistance(place.location);

  const mapsUrl = safeExternalUrl(place.googleMapsUri) ?? buildGoogleMapsUrl(place);
  const websiteUrl = safeExternalUrl(place.websiteUri);
  const directionsUrl = buildGoogleMapsDirectionsUrl(place);
  const openingHours = place.currentOpeningHours ?? place.regularOpeningHours;
  const featureLabels = getAvailableFeatureLabels(place.features);
  const tags = getPlaceTags(place);
  const verifiedPriceRange = formatVerifiedPriceRange(place);
  const menuUrl = `/menu/${encodeURIComponent(place.id)}` as Route;
  const goBack = () => {
    if (window.history.length > 1) router.back();
    else router.push("/explore?intent=food");
  };

  const sharePlace = async () => {
    setShareStatus(undefined);
    const shareData = {
      title: place.displayName.text,
      text: `Tối nay tụi mình đi ${place.displayName.text} nhé ❤️`,
      url: mapsUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setShareStatus("Đã mở bảng chia sẻ.");
        return;
      }
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
        setShareStatus("Đã sao chép link để gửi cho người yêu.");
        return;
      }
      setShareStatus("Trình duyệt này chưa hỗ trợ chia sẻ.");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setShareStatus("Chưa chia sẻ được. Hãy thử lại nhé.");
    }
  };

  return (
    <main className="pb-48">
      <div className="relative">
        <PlacePhoto
          photo={place.photos[0]}
          placeName={place.displayName.text}
          className="rounded-b-[2rem]"
        />
        <Button
          variant="outline"
          size="icon"
          className="absolute left-4 top-[max(1rem,env(safe-area-inset-top))] z-10 border-white/60 bg-background/90 shadow-md backdrop-blur"
          onClick={goBack}
          aria-label="Quay lại kết quả"
        >
          <ArrowLeft />
        </Button>
      </div>

      <div className="space-y-6 px-4 pt-5">
        <section>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold text-primary">
                {place.primaryType ? formatPlaceType(place.primaryType) : "Địa điểm ăn uống"}
              </p>
              <h1 className="mt-1 text-3xl font-black leading-tight tracking-[-0.04em]">
                {place.displayName.text}
              </h1>
            </div>
            <span
              className={cn(
                "mt-1 shrink-0 rounded-full px-2.5 py-1 text-xs font-bold",
                openingHours?.openNow === true && "bg-emerald-100 text-emerald-700",
                openingHours?.openNow === false && "bg-red-100 text-red-700",
                openingHours?.openNow === undefined && "bg-muted text-muted-foreground",
              )}
            >
              {openingHours?.openNow === true
                ? "Đang mở"
                : openingHours?.openNow === false
                  ? "Đang đóng"
                  : "Chưa rõ giờ"}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
            <span className="flex items-center gap-1 font-bold">
              <Star className="size-4 fill-amber-400 text-amber-500" />
              {place.rating?.toFixed(1) ?? "—"}
              <span className="font-medium text-muted-foreground">Google rating</span>
            </span>
            <span className="text-muted-foreground">
              {formatReviewCount(place.userRatingCount)}
            </span>
          </div>

          {tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold text-secondary-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </section>

        <section className="grid grid-cols-2 gap-3" aria-label="Giá và khoảng cách">
          <Card>
            <CardContent className="p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                {verifiedPriceRange ? "Khoảng giá Google" : "Mức giá Google"}
              </p>
              <p className="mt-1 text-sm font-black">
                {verifiedPriceRange ?? formatPriceLevel(place.priceLevel)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Khoảng cách
              </p>
              {distanceMeters === undefined ? (
                <button
                  className="mt-1 min-h-8 text-left text-xs font-bold text-primary"
                  onClick={calculateDistance}
                  disabled={isLocating}
                >
                  {isLocating ? (
                    <span className="flex items-center gap-1.5">
                      <LoaderCircle className="size-3.5 animate-spin" /> Đang định vị…
                    </span>
                  ) : (
                    "Dùng vị trí của tôi"
                  )}
                </button>
              ) : (
                <p className="mt-1 text-sm font-black">{formatDistance(distanceMeters)}</p>
              )}
            </CardContent>
          </Card>
        </section>

        {distanceError && (
          <p className="rounded-2xl bg-red-50 px-4 py-3 text-xs font-semibold text-red-700" role="alert">
            {distanceError}
          </p>
        )}

        <Card>
          <CardContent className="space-y-4 p-4">
            {place.formattedAddress && (
              <p className="flex items-start gap-3 text-sm leading-6">
                <MapPin className="mt-0.5 size-5 shrink-0 text-primary" />
                {place.formattedAddress}
              </p>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Button asChild variant="outline">
                <Link href={menuUrl}>
                  Xem menu
                  <BookOpen />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
                  Google Maps
                  <ExternalLink />
                </a>
              </Button>
              {websiteUrl && (
                <Button asChild variant="outline">
                  <a href={websiteUrl} target="_blank" rel="noopener noreferrer">
                    Website
                    <Globe2 />
                  </a>
                </Button>
              )}
              <Button variant="outline" onClick={() => void sharePlace()}>
                Gửi người yêu
                <Send />
              </Button>
            </div>
            {shareStatus && (
              <p className="text-center text-xs font-semibold text-primary" role="status">
                {shareStatus}
              </p>
            )}
          </CardContent>
        </Card>

        {openingHours && (
          <section aria-labelledby="hours-heading">
            <div className="mb-3 flex items-center gap-2">
              <Clock3 className="size-5 text-primary" />
              <h2 id="hours-heading" className="text-xl font-black">
                Giờ mở cửa
              </h2>
            </div>
            <Card>
              <CardContent className="space-y-2 p-4 text-sm">
                {openingHours.weekdayDescriptions.length > 0 ? (
                  openingHours.weekdayDescriptions.map((description) => (
                    <p key={description} className="leading-6">
                      {description}
                    </p>
                  ))
                ) : (
                  <p className="text-muted-foreground">Chưa có lịch mở cửa chi tiết.</p>
                )}
              </CardContent>
            </Card>
          </section>
        )}

        {featureLabels.length > 0 && (
          <section aria-labelledby="features-heading">
            <h2 id="features-heading" className="text-xl font-black">
              Tiện ích
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {featureLabels.map(({ key, label, emoji }) => (
                <span
                  key={key}
                  className="flex min-h-11 items-center gap-2 rounded-2xl bg-secondary px-3 text-xs font-bold text-secondary-foreground"
                >
                  <span aria-hidden="true">{emoji}</span>
                  {label}
                </span>
              ))}
            </div>
          </section>
        )}

        <PlaceReviews reviews={place.reviews} />

        {selected && (
          <Card className="border-primary bg-primary/10">
            <CardContent className="flex items-start gap-3 p-4 text-primary" role="status">
              <Sparkles className="mt-0.5 size-5 shrink-0" />
              <div>
                <p className="font-black">Tối nay đi quán này ❤️</p>
                <p className="mt-1 text-sm">{place.displayName.text}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <GoogleMapsAttribution className="border-t border-border pt-4" />
      </div>

      <footer className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-30 mx-auto grid max-w-lg grid-cols-2 gap-2 border-t border-border/70 bg-background/92 p-3 backdrop-blur-xl">
        <Button asChild variant="outline" size="lg">
          <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
            <Navigation />
            Chỉ đường
          </a>
        </Button>
        <Button size="lg" onClick={() => setSelected(true)} variant={selected ? "secondary" : "default"}>
          {selected ? <Check /> : <Sparkles />}
          {selected ? "Đã chọn" : "Chọn quán này"}
        </Button>
      </footer>
    </main>
  );
}

export function RestaurantDetail({ placeId }: RestaurantDetailProps) {
  const [retryCount, setRetryCount] = useState(0);
  const [place, setPlace] = useState<PlaceDetails>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12_000);
    let active = true;

    void getPlaceDetails(placeId, controller.signal)
      .then((result) => {
        if (active) setPlace(result);
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        if (requestError instanceof Error && requestError.name === "AbortError") {
          setError("Tải thông tin quán hơi lâu. Hãy thử lại nhé.");
          return;
        }
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Chưa thể tải thông tin quán.",
        );
      })
      .finally(() => window.clearTimeout(timeout));

    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [placeId, retryCount]);

  if (error) {
    return (
      <DetailError
        message={error}
        onRetry={() => {
          setError(undefined);
          setPlace(undefined);
          setRetryCount((count) => count + 1);
        }}
      />
    );
  }
  if (!place) return <RestaurantDetailSkeleton />;
  return <DetailContent place={place} />;
}
