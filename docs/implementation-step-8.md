# Implementation report — STEP 8

## Outcome

`POST /api/search` đã nối Food Preference Wizard với `PlaceProvider` phía server. Endpoint nhận tối đa 16 KB JSON, validate bằng Zod, rate-limit theo actor, gọi Places API (New) qua abstraction và trả `Cache-Control: private, no-store`. Wizard có loading/error state và không còn tạo kết quả giả.

Luồng request:

```text
FoodPreferenceWizard
  → typed browser API client (12s timeout)
  → POST /api/search
  → request size/content-type checks
  → actor rate limit
  → Zod boundary
  → discovery use-case
  → cuisine mapping
  → PlaceProvider
  → GooglePlacesProvider
```

## Search và compliance

- Một cuisine được map sang text query tiếng Việt và một Place Type hợp lệ khi có thể; nhiều cuisine dùng text query để không biểu diễn sai phép OR bằng `includedTypes`.
- Random dùng Nearby Search với type `restaurant`; search có cuisine dùng Text Search.
- Google order được giữ nguyên. Service chỉ áp dụng exact filters và không tạo “Google Score” hoặc custom reranking.
- Search Field Mask chỉ lấy summary fields, photo references và trạng thái mở cửa khi cần. `nextPageToken` không được request vì API sản phẩm chỉ trả 5–10 kết quả trong STEP 8.
- VND/người không được suy diễn thành Google `priceLevel`. Response ghi rõ `budgetVerification: "unavailable"`; budget, mood và option chưa xác minh nằm trong `deferredFilters`.
- Khi không có kết quả, API chỉ gợi ý nới radius/rating/review count. Maximum budget và dietary restriction không bị tự đổi.
- Places response không được cache ở service worker, server hoặc CDN.

Place Types sử dụng theo danh mục chính thức: [Google Places API (New) Place Types](https://developers.google.com/maps/documentation/places/web-service/place-types). Redis limiter dùng một atomic `EVAL` request theo REST contract: [Upstash REST API](https://upstash.com/docs/redis/features/restapi).

## API behavior

Success:

```json
{
  "data": {
    "places": [],
    "suggestions": [],
    "meta": {
      "provider": "google_places",
      "order": "google",
      "effectiveRadiusMeters": 3000,
      "appliedFilters": ["radiusMeters", "cuisines", "minRating", "minReviewCount"],
      "deferredFilters": ["budget", "mood:quiet"],
      "budgetVerification": "unavailable",
      "googleAttributionRequired": true
    }
  },
  "requestId": "uuid"
}
```

Error:

```json
{
  "error": {
    "code": "INVALID_SEARCH_REQUEST",
    "message": "Một số tiêu chí tìm kiếm chưa hợp lệ.",
    "requestId": "uuid",
    "details": [{ "path": "cuisines", "message": "..." }]
  }
}
```

Endpoint trả các status có kiểm soát cho media type, body size, malformed JSON, validation, rate limit, thiếu Google key, upstream timeout/quota và lỗi nội bộ. Raw upstream error/credential không đi ra client. Mọi response có request ID; response sau rate-limit check có limit/remaining/reset headers.

## Rate limiting

- Giới hạn search hiện tại: 10 request/phút/actor.
- Actor key là SHA-256 của địa chỉ proxy/IP đã chuẩn hóa; không lưu raw IP trong limiter key.
- Local/single process dùng `InMemoryRateLimiter`.
- Khi có cả `UPSTASH_REDIS_REST_URL` và `UPSTASH_REDIS_REST_TOKEN`, production dùng `UpstashRateLimiter` với atomic `INCR` + `EXPIRE`, timeout 2 giây và fail closed khi dịch vụ bảo vệ chi phí không khả dụng.
- Multi-instance Vercel phải cấu hình Upstash; memory fallback không phải distributed limiter.

## Files created

- `src/app/api/search/route.ts`
- `src/features/discovery/search-contract.ts`
- `src/features/discovery/api/search-restaurants.ts`
- `src/lib/http/api-response.ts`
- `src/lib/http/request-actor.ts`
- `src/lib/rate-limit/types.ts`
- `src/lib/rate-limit/in-memory.ts`
- `src/lib/rate-limit/upstash.ts`
- `src/lib/rate-limit/index.ts`
- `src/services/discovery/cuisine-mapping.ts`
- `src/services/discovery/search-restaurants.ts`
- `src/lib/rate-limit/in-memory.test.ts`
- `src/lib/rate-limit/upstash.test.ts`
- `src/services/discovery/search-restaurants.test.ts`
- `docs/implementation-step-8.md`

## Files updated

- `src/features/discovery/components/food-preference-wizard.tsx`
- `src/features/discovery/components/discovery-ready.tsx`
- `src/lib/env/server.ts`
- `src/services/places/place-provider.ts`
- `src/services/places/google/field-masks.ts`
- `src/services/places/google/google-places.provider.ts`
- `src/services/places/google/google-places.provider.test.ts`
- `.env.example`
- `README.md`
- `docs/architecture.md`
- `docs/folder-structure.md`

## Verification

- `npm run typecheck`
- `npm run lint`
- `npm test` — 7 files, 14 tests
- Endpoint smoke tests: 415 media type, 400 malformed JSON, 422 invalid contract, 503 missing Places configuration, plus no-store/rate/request headers
- `npm run build`

Live Google results require a valid restricted `GOOGLE_MAPS_API_KEY`; the automated tests mock upstream fetch and never consume Google quota.
