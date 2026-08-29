# Implementation report — STEP 9

## Outcome

Search results hiện render thành danh sách `RestaurantCard` mobile-first thay vì màn hình placeholder. Mỗi card hiển thị dữ liệu đúng nguồn, có hành động mở Google Maps và “Chọn quán”; empty-state yêu cầu người dùng bấm xác nhận trước khi nới từng filter.

## Restaurant Card

Mỗi card hiện có:

- một ảnh tải on-demand hoặc visual fallback;
- tên và primary type;
- nhãn **Google rating** tách biệt với logic của ứng dụng;
- review count dạng compact, khoảng cách Haversine và Google price level;
- trạng thái đang mở/đóng/chưa rõ;
- địa chỉ và tối đa ba place type tags;
- nút “Xem bản đồ” dùng Google Maps universal deep link cùng `query_place_id`;
- nút “Chọn quán” với confirmation rõ ràng, chỉ nằm trong React state và không giả vờ đã lưu;
- text attribution “Google Maps” trong cùng visual container.

Search order không bị thay đổi trong UI. Card không hiển thị “Độ phù hợp” vì STEP 9 chưa có policy-approved recommendation score.

## Photo architecture

```text
RestaurantCard enters viewport
  → POST /api/place/photo (resourceName + bounded width)
  → Zod + 2 KB body limit + 60/min actor rate limit
  → PlaceProvider.getPlacePhotos()
  → Place Photos (New), server key only
  → short-lived HTTPS photoUri, Cache-Control: private, no-store
  → plain lazy <img>, bypass Next Image optimizer/cache
```

- Search summary chỉ chuyển một photo reference cho mỗi place.
- Card không gọi photo API trước khi nằm trong viewport.
- Photo resource name, response và image URI không được ghi vào localStorage, IndexedDB, database hoặc service-worker cache.
- Nếu Google trả author attribution, card hiển thị toàn bộ author names/profile links.
- Nếu có `googleMapsUri`, card luôn cung cấp “Nguồn ảnh” dẫn tới ảnh trên Google Maps.
- Photo endpoint không redirect tùy ý; chỉ trả URI HTTPS đã validate dưới JSON `no-store`.

Thiết kế tuân theo hướng dẫn [Place Photos (New)](https://developers.google.com/maps/documentation/places/web-service/place-photos) và [Places policies and attributions](https://developers.google.com/maps/documentation/places/web-service/policies).

## Empty-state behavior

API đưa tối đa ba suggestion cho radius, Google rating hoặc review count. UI biến từng suggestion thành button; chỉ sau khi người dùng bấm thì draft mới thay đổi và search mới được gửi.

- Wizard state được đồng bộ với filter vừa chấp nhận.
- Nếu retry lỗi, UI giữ đúng draft đã chấp nhận để thử lại.
- Budget maximum, cuisines và dietary options không bị mutation bởi relaxation function.
- Giá/người, mood và tiện ích chưa xác minh được ghi rõ trong results warning thay vì trở thành tag sai sự thật.

## Files created

- `src/app/api/place/photo/route.ts`
- `src/features/discovery/components/empty-search-results.tsx`
- `src/features/discovery/search-relaxation.ts`
- `src/features/discovery/search-relaxation.test.ts`
- `src/features/restaurant/photo-contract.ts`
- `src/features/restaurant/photo-contract.test.ts`
- `src/features/restaurant/api/get-place-photo.ts`
- `src/features/restaurant/place-formatters.ts`
- `src/features/restaurant/place-formatters.test.ts`
- `src/features/restaurant/components/google-maps-attribution.tsx`
- `src/features/restaurant/components/place-photo.tsx`
- `src/features/restaurant/components/restaurant-card.tsx`
- `src/features/restaurant/components/restaurant-card.test.tsx`
- `src/features/restaurant/components/restaurant-results.tsx`
- `docs/implementation-step-9.md`

## Files updated

- `src/app/api/search/route.ts`
- `src/features/discovery/components/discovery-ready.tsx`
- `src/features/discovery/components/food-preference-wizard.tsx`
- `src/lib/http/api-response.ts`
- `src/lib/rate-limit/index.ts`
- `src/services/places/google/google-places.mapper.ts`
- `src/services/places/google/google-places.mapper.test.ts`
- `vitest.config.ts`
- `README.md`
- `docs/architecture.md`
- `docs/folder-structure.md`

## Verification

- `npm run typecheck`
- `npm run lint`
- `npm test` — 11 files, 22 tests
- Photo endpoint smoke tests cho unsupported media type, invalid contract và missing Places key
- `npm run build`

Live search/photo chưa thể được gọi tự động khi `.env.local` chưa có restricted `GOOGLE_MAPS_API_KEY`; provider tests dùng mocked upstream fetch và không tiêu thụ Google quota.
