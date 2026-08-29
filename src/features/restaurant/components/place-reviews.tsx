import { ExternalLink, Star } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { safeExternalUrl } from "@/features/restaurant/place-formatters";
import type { PlaceReview } from "@/types/place";

export function PlaceReviews({ reviews }: { reviews: PlaceReview[] }) {
  return (
    <section aria-labelledby="reviews-heading">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Cảm nhận</p>
          <h2 id="reviews-heading" className="mt-1 text-xl font-black">
            Đánh giá trên Google
          </h2>
        </div>
        <span className="text-xs text-muted-foreground">Tối đa 5 đánh giá</span>
      </div>

      {reviews.length === 0 ? (
        <Card>
          <CardContent className="text-sm leading-6 text-muted-foreground">
            Google Maps chưa cung cấp đánh giá cho địa điểm này.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reviews.map((review, index) => {
            const author = review.authorAttribution;
            const authorUrl = safeExternalUrl(author?.uri);
            const authorPhotoUrl = safeExternalUrl(author?.photoUri);
            const sourceUrl = safeExternalUrl(review.googleMapsUri);

            return (
              <Card key={review.resourceName ?? `${review.publishTime}-${index}`}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      {authorPhotoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={authorPhotoUrl}
                          alt=""
                          className="size-9 rounded-full object-cover"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-sm font-black text-primary">
                          {author?.displayName.slice(0, 1).toLocaleUpperCase("vi-VN") ?? "G"}
                        </span>
                      )}
                      <div className="min-w-0">
                        {authorUrl ? (
                          <a
                            href={authorUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block truncate text-sm font-bold hover:underline"
                          >
                            {author?.displayName ?? "Người dùng Google"}
                          </a>
                        ) : (
                          <p className="truncate text-sm font-bold">
                            {author?.displayName ?? "Người dùng Google"}
                          </p>
                        )}
                        <p className="text-[11px] text-muted-foreground">
                          {review.relativePublishTimeDescription ?? "Đánh giá trên Google"}
                        </p>
                      </div>
                    </div>
                    <span className="flex shrink-0 items-center gap-1 text-xs font-bold">
                      <Star className="size-3.5 fill-amber-400 text-amber-500" />
                      {review.rating?.toFixed(1) ?? "—"}
                    </span>
                  </div>

                  {review.text?.text && (
                    <p className="text-sm leading-6 text-foreground/90">{review.text.text}</p>
                  )}

                  {sourceUrl && (
                    <a
                      href={sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center gap-1.5 text-xs font-bold text-primary"
                    >
                      Xem đánh giá nguồn trên Google Maps
                      <ExternalLink className="size-3.5" />
                    </a>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
