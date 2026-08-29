# Implementation report — STEP 11

## Outcome

MenuResolver basic đã hoạt động theo chuỗi nguồn có provenance rõ ràng:

```text
GET /api/place/:placeId/menu
  → verified Supabase menu
  → khi miss: fresh Google Place Details cho fallback/official website capability

POST /api/menu/resolve (chỉ sau thao tác người dùng)
  → re-check verified Supabase menu
  → fresh websiteUri từ Google Place Details
  → robots.txt
  → SSRF-safe, bounded fetch trên official host
  → schema.org JSON-LD parser
  → bounded static HTML parser
  → normalized transient menu hoặc explicit fallback
```

Client không được gửi website URL cho crawler. Server chỉ lấy `websiteUri` mới từ `PlaceProvider`, do đó `/api/menu/resolve` chỉ nhận `{ "placeId": "..." }`. Menu website chính thức hiện được xử lý transient và không tự động persist khi chưa có quyền lưu/nội dung rõ ràng.

## Provider model

`MenuProvider` trả đúng một trong bốn trạng thái: `resolved`, `miss`, `blocked`, `failed`. `MenuResolver` giữ danh sách attempt nhưng không trả raw exception hay HTML ra client.

- `DatabaseMenuProvider` chỉ đọc menu `verified = true` qua Supabase RLS; tối đa 10 menu, 50 section và 500 item.
- `OfficialWebsiteMenuProvider` chỉ truy cập official hostname hoặc biến thể `www`, tối đa ba HTML page.
- Merchant và user-upload/OCR vẫn thuộc post-MVP như roadmap ban đầu; UI nói rõ điều này thay vì giả lập upload thành công.
- Fallback luôn nói “Chưa tìm thấy menu chính xác”, chỉ dùng Google `priceRange`/`priceLevel` khi thực sự có dữ liệu.

## Crawler security

- Chỉ `GET` qua HTTP/HTTPS, không credential URL và không non-standard port.
- Resolve DNS trước mỗi request/redirect; nếu bất kỳ address nào là loopback/private/link-local/reserved/metadata thì chặn toàn bộ target.
- Pin public IP vào Node lookup để giảm DNS-rebinding risk; redirect được revalidate và không rời official host.
- Tôn trọng `robots.txt`; fail closed khi robots không xác minh được hoặc crawl-delay vượt giới hạn.
- Global concurrency 4, per-origin concurrency 1, tối thiểu 250 ms giữa page; timeout 4 giây/page.
- HTML tối đa 1.5 MB, robots tối đa 500 KB, headers tối đa 16 KB, content type allowlist, không nhận compressed response.
- Không execute JavaScript. Parser ưu tiên schema.org `Restaurant`, `Menu`, `MenuSection`, `MenuItem`, `Product`, `Offer`, sau đó mới dùng một tập selector HTML tĩnh có giới hạn.
- Không crawl/OCR ảnh hay menu từ Google Maps.

Robots implementation tuân theo nguyên tắc fail-closed dựa trên [RFC 9309](https://www.rfc-editor.org/info/rfc9309/); structured menu parser dựa trên [Schema.org Menu](https://schema.org/Menu), [MenuItem](https://schema.org/MenuItem) và [hasMenuSection](https://schema.org/hasMenuSection).

## Menu UX

- Route mobile-first `/menu/[placeId]`, truy cập từ Restaurant Detail.
- Search món không dấu, tab ngang theo section thực tế, item/description/price.
- Nguồn menu và ngày cập nhật luôn hiển thị.
- Ước tính hai người chỉ xuất hiện khi menu đã verified, không phải community, có ít nhất tám món và tối thiểu 80% món có giá VND.
- Fallback có website, Google Maps, Google price context và lý do robots/menu-not-found ở ngôn ngữ thân thiện.
- Google attribution được đặt cùng context lấy từ Place Details.

## APIs

| Endpoint | Limit | Hành vi |
|---|---:|---|
| `GET /api/place/:placeId/menu` | 30/phút/actor | DB-first; Place Details chỉ gọi khi DB miss |
| `POST /api/menu/resolve` | 3/10 phút/actor | user-triggered official website resolution |

Cả hai response đều `private, no-store`, có request ID và rate-limit headers. POST giới hạn JSON body 2 KB và validate strict bằng Zod.

## Files created

- `src/types/menu.ts`
- `src/features/menu/menu-contract.ts`
- `src/features/menu/menu-place-context.ts`
- `src/features/menu/menu-formatters.ts`
- `src/features/menu/menu-formatters.test.ts`
- `src/features/menu/api/get-menu.ts`
- `src/features/menu/components/menu-page.tsx`
- `src/features/menu/components/menu-view.tsx`
- `src/features/menu/components/menu-fallback.tsx`
- `src/app/api/place/[placeId]/menu/route.ts`
- `src/app/api/menu/resolve/route.ts`
- `src/app/menu/[placeId]/page.tsx`
- `src/app/menu/[placeId]/loading.tsx`
- `src/services/menu-resolver/index.ts`
- `src/services/menu-resolver/menu-provider.ts`
- `src/services/menu-resolver/menu-resolver.ts`
- `src/services/menu-resolver/menu-resolver.test.ts`
- `src/services/menu-resolver/providers/database-menu.provider.ts`
- `src/services/menu-resolver/providers/database-menu.provider.test.ts`
- `src/services/menu-resolver/providers/official-website-menu.provider.ts`
- `src/services/menu-resolver/providers/official-website-menu.provider.test.ts`
- `src/services/menu-resolver/parsers/menu-parser.ts`
- `src/services/menu-resolver/parsers/menu-parser.test.ts`
- `src/services/menu-resolver/safe-fetch/safe-url.ts`
- `src/services/menu-resolver/safe-fetch/safe-url.test.ts`
- `src/services/menu-resolver/safe-fetch/safe-http-fetcher.ts`
- `src/services/menu-resolver/safe-fetch/robots-policy.ts`
- `src/services/menu-resolver/safe-fetch/robots-policy.test.ts`
- `docs/implementation-step-11.md`

## Files updated

- `src/features/restaurant/components/restaurant-detail.tsx`
- `package.json`
- `package-lock.json`
- `README.md`
- `docs/architecture.md`
- `docs/folder-structure.md`

## Dependencies

- `cheerio@1.2.0` — parse JSON-LD/static HTML without executing JavaScript.
- `robots-parser@3.0.1` — evaluate robots rules for the crawler user-agent.
- `ipaddr.js@2.5.0` — classify IPv4/IPv6 and mapped addresses for SSRF defense.

`cheerio@1.2.0` requires Node.js 20.18.1+, nên engine của repository đã được nâng tương ứng.

## Verification

- `npm run typecheck`
- `npm run lint`
- `npm test` — 22 files, 55 tests trước production build
- API smoke: DB-not-configured trả explicit fallback HTTP 200 với `no-store`; menu page và health trả HTTP 200
- `npm run build`

Live official menu resolution cần Supabase hợp lệ và/hoặc restricted `GOOGLE_MAPS_API_KEY`. Unit tests không gọi Google hoặc crawl Internet thật.
