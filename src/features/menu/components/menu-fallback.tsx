"use client";

import { ExternalLink, Globe2, ImageUp, LoaderCircle, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GoogleMapsAttribution } from "@/features/restaurant/components/google-maps-attribution";
import { formatMenuFallbackPrice } from "@/features/menu/menu-formatters";
import { safeExternalUrl } from "@/features/restaurant/place-formatters";
import type { MenuApiData } from "@/types/menu";

type MenuFallbackProps = {
  data: MenuApiData;
  resolving: boolean;
  resolveError?: string;
  onResolve: () => void;
  onCommunityUpload: () => void;
};

function officialAttemptMessage(data: MenuApiData) {
  const attempt = [...data.resolution.attempts]
    .reverse()
    .find((item) => item.provider === "official_website");
  if (!attempt) return undefined;
  if (attempt.reason === "robots_disallowed") {
    return "Website chính thức không cho phép công cụ tự động đọc trang menu.";
  }
  if (
    attempt.reason === "robots_unavailable" ||
    attempt.reason === "crawl_delay_too_high"
  ) {
    return "Ứng dụng không thể xác nhận quyền truy cập theo robots.txt nên đã dừng.";
  }
  if (attempt.reason === "official_website_missing") {
    return "Google Places chưa cung cấp website chính thức cho địa điểm này.";
  }
  if (attempt.status === "failed") {
    return "Website chính thức chưa phản hồi hoặc nội dung vượt giới hạn an toàn.";
  }
  if (attempt.reason === "menu_not_found") {
    return "Đã kiểm tra website chính thức nhưng chưa thấy menu có cấu trúc rõ ràng.";
  }
  return undefined;
}

export function MenuFallback({
  data,
  resolving,
  resolveError,
  onResolve,
  onCommunityUpload,
}: MenuFallbackProps) {
  const price = formatMenuFallbackPrice(data.place);
  const websiteUrl = safeExternalUrl(data.place?.websiteUri);
  const mapsUrl = safeExternalUrl(data.place?.googleMapsUri);
  const resolutionMessage = officialAttemptMessage(data);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-5 text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-[1.5rem] bg-secondary text-3xl">
            📖
          </span>
          <h1 className="mt-4 text-2xl font-black">Chưa tìm thấy menu chính xác.</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {data.place?.displayName
              ? `Ứng dụng chưa có thực đơn đáng tin cậy của ${data.place.displayName}.`
              : "Ứng dụng chưa có thực đơn đáng tin cậy của quán này."}
          </p>

          {price && (
            <div className="mt-4 rounded-2xl bg-muted px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Mức giá tham khảo từ Google
              </p>
              <p className="mt-1 font-black">{price}</p>
            </div>
          )}

          {resolutionMessage && (
            <p className="mt-4 text-xs leading-5 text-muted-foreground" role="status">
              {resolutionMessage}
            </p>
          )}
          {resolveError && (
            <p className="mt-4 text-xs font-semibold leading-5 text-red-700" role="alert">
              {resolveError}
            </p>
          )}

          {data.canResolveOfficialWebsite && (
            <Button
              className="mt-5 w-full"
              size="lg"
              onClick={onResolve}
              disabled={resolving}
            >
              {resolving ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <Search />
              )}
              {resolving ? "Đang kiểm tra website…" : "Tìm trên website chính thức"}
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-2">
        {websiteUrl && (
          <Button asChild variant="outline">
            <a href={websiteUrl} target="_blank" rel="noopener noreferrer">
              <Globe2 /> Website
            </a>
          </Button>
        )}
        {mapsUrl && (
          <Button asChild variant="outline">
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
              Google Maps <ExternalLink />
            </a>
          </Button>
        )}
      </div>

      <Button className="w-full" variant="secondary" onClick={onCommunityUpload}>
        <ImageUp /> Gửi ảnh menu để cộng đồng cập nhật
      </Button>

      {data.place && <GoogleMapsAttribution />}
    </div>
  );
}
