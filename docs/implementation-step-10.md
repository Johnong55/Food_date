# Implementation report — STEP 10

## Outcome

Restaurant Cards hiện dẫn tới `/restaurant/[placeId]`. Trang này không mang Places Content từ search sang URL hoặc storage; sau khi mở, client gọi `GET /api/place/:placeId` để lấy Place Details mới qua server-only `PlaceProvider`.

## Detail API

```text
Restaurant Detail route
  → GET /api/place/:placeId
  → actor rate limit 30/min
  → opaque Place ID validation
  → GooglePlacesProvider.getPlaceDetails()
  → explicit Detail Field Mask
  → PlaceDetails domain mapping
  → private, no-store response
```

Endpoint yêu cầu các nhóm dữ liệu đắt hơn như reviews và attributes chỉ sau khi người dùng mở detail. Wildcard Field Mask không được dùng. Provider error được chuyển thành error code có kiểm soát cho not-found, timeout, quota/permission và upstream error; raw Google error hoặc API key không được trả ra client.

## Detail UX

Trang chi tiết mobile-first gồm:

- hero photo với author/source attribution;
- tên, type tags, trạng thái mở cửa;
- **Google rating** và review count;
- Google price range nếu API thực sự cung cấp, nếu không chỉ hiển thị price level;
- địa chỉ, Google Maps, website và Web Share/copy fallback;
- regular/current opening hours;
- dine-in, takeout, delivery, reservable, outdoor, group/children, live music, meal, coffee, dessert, vegetarian, cocktail và parking attributes khi giá trị là `true`;
- tối đa năm Google reviews, mỗi review giữ author attribution và link nguồn Google Maps;
- sticky actions “Chỉ đường” và “Chọn quán này”.

Save, persisted decision và Menu không được giả lập trong STEP 10; chúng lần lượt thuộc STEP 14 và STEP 11.

## Location privacy

Khoảng cách không được truyền bằng query string, cookie hoặc session storage. Detail UI chỉ gọi `navigator.geolocation` sau khi người dùng bấm “Dùng vị trí của tôi”, sau đó tính Haversine trong browser. Tọa độ không được gửi tới detail API.

## Google data handling

- Place Details và review/photo content không được persist hoặc service-worker cache.
- Card chỉ truyền Place ID, là ngoại lệ được phép lưu theo Places policy.
- `websiteUri` và attribution links chỉ render khi parse thành HTTP/HTTPS URL.
- Review author/source links nằm cùng review container; Google Maps text attribution nằm cùng Place Details container.
- Search/detail summary chỉ giữ một photo reference vì UI hiện chỉ render hero photo.
- `servesCocktails` và `parkingOptions` được thêm theo [Places REST resource schema](https://developers.google.com/maps/documentation/places/web-service/reference/rest/v1/places).

## Files created

- `src/app/api/place/[placeId]/route.ts`
- `src/app/restaurant/[placeId]/page.tsx`
- `src/app/restaurant/[placeId]/loading.tsx`
- `src/features/restaurant/detail-contract.ts`
- `src/features/restaurant/detail-contract.test.ts`
- `src/features/restaurant/detail-formatters.ts`
- `src/features/restaurant/detail-formatters.test.ts`
- `src/features/restaurant/api/get-place-details.ts`
- `src/features/restaurant/hooks/use-place-distance.ts`
- `src/features/restaurant/components/place-reviews.tsx`
- `src/features/restaurant/components/place-reviews.test.tsx`
- `src/features/restaurant/components/restaurant-detail.tsx`
- `src/features/restaurant/components/restaurant-detail-skeleton.tsx`
- `src/lib/geo/distance.ts`
- `src/lib/geo/distance.test.ts`
- `docs/implementation-step-10.md`

## Files updated

- `src/features/restaurant/components/place-photo.tsx`
- `src/features/restaurant/components/restaurant-card.tsx`
- `src/features/restaurant/components/restaurant-card.test.tsx`
- `src/features/restaurant/place-formatters.ts`
- `src/services/places/google/field-masks.ts`
- `src/services/places/google/google-places.schemas.ts`
- `src/services/places/google/google-places.mapper.ts`
- `src/services/places/google/google-places.provider.ts`
- `src/services/places/google/google-places.provider.test.ts`
- `src/types/place.ts`
- `README.md`
- `docs/architecture.md`
- `docs/folder-structure.md`

## Verification

- `npm run typecheck`
- `npm run lint`
- `npm test` — 15 files, 30 tests
- API smoke tests: invalid Place ID 400, missing Places key 503, no-store/rate-limit/request-ID headers
- detail page shell: HTTP 200
- `npm run build`

Live detail/photo content requires a valid restricted `GOOGLE_MAPS_API_KEY`; provider tests mock Google fetch and do not consume quota.
