# Đi Đâu Ăn Gì?

Mobile-first PWA giúp cặp đôi và nhóm bạn quyết định ăn gì, uống gì và đi đâu mà không phải lướt vô tận.

Repository hiện hoàn thành **STEP 1 → STEP 15**:

- kiến trúc sản phẩm, hệ thống, dữ liệu, API, PWA và MenuResolver;
- Next.js 16 App Router, React 19, TypeScript strict, Tailwind CSS v4 và shadcn/ui foundation;
- Supabase SSR/Auth, Google OAuth entry point và guest-safe shell;
- manifest, service worker, offline shell, install UX và icon PWA;
- `PlaceProvider` abstraction cùng `GooglePlacesProvider` dùng Places API (New), explicit Field Mask và `no-store`;
- Food Preference Wizard 5 bước với geolocation theo thao tác, chọn khu vực thủ công và search draft đã validate;
- `POST /api/search` với Zod validation, cost-aware Field Mask, Google-order filtering, `no-store`, timeout và rate limiting;
- Restaurant Cards mobile-first với Google attribution, photo author/source attribution, Maps deep link và lựa chọn quán cục bộ;
- Place Photos tải on-demand khi card vào viewport qua endpoint server-only `no-store`, không qua Next Image optimizer;
- empty-state chỉ nới filter sau thao tác rõ ràng của người dùng và giữ nguyên budget/diet constraints;
- Restaurant Detail tải Place Details on-demand với opening hours, reviews, price range, website và attributes;
- detail actions gồm chỉ đường, mở Google Maps, website, Web Share và chọn quán; khoảng cách chỉ tính sau thao tác định vị riêng;
- MenuResolver DB-first với provider abstraction, provenance/freshness, schema.org/static HTML parser và explicit fallback;
- official website crawler chỉ chạy sau thao tác người dùng, tuân thủ robots.txt, chặn SSRF/DNS rebinding và giới hạn timeout/size/concurrency;
- trang menu mobile-first có search món, section tabs, nguồn dữ liệu, ngày cập nhật và price fallback;
- Couple Session cho guest/user với share code/link, membership cookie an toàn và thời hạn 24 giờ;
- preference riêng tư, readiness polling và intersection ngân sách/radius/cuisine/mood không làm lộ lựa chọn riêng của partner;
- candidate deck giữ thứ tự Google, chỉ persist Place ID, swipe kín left/right/super-like và match detection atomic;
- swipe card hỗ trợ kéo ngang, optimistic rollback, match polling và màn ăn mừng chỉ khi cả hai cùng thích;
- Save/Collections dùng Supabase user session + RLS, chỉ persist Place ID và tải fresh Places Content theo viewport;
- History timeline lưu rating, ghi chú, ngày ghé và chi phí do người dùng sở hữu; restaurant detail có optimistic Save/Visited actions;
- migration PostgreSQL có indexes, constraints, RLS và explicit least-privilege grants;
- CSP/HSTS/security headers, readiness health check và structured server error logging không chứa cookies/query;
- production Playwright trên Pixel 7, Axe WCAG checks, Lighthouse CI median ≥90 và database pgTAP security suite;
- GitHub Actions quality/browser/database gates cùng Vercel/Supabase/Google release runbook.

## Chạy local

Yêu cầu Node.js 20.18.1+ và npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000). App shell và guest mode chạy được khi chưa điền Supabase/Google credentials. Các tích hợp tương ứng chỉ được bật khi có cấu hình hợp lệ.

## Kiểm tra chất lượng

```bash
npm run build        # production bundle
npm run lint
npm run typecheck
npm test             # unit/contract
npm run test:e2e     # production server + mobile Playwright + Axe + PWA checks
npm run lighthouse   # median Lighthouse gate trên Home và Explore
npm run test:db      # pgTAP; cần Supabase local/Docker đang chạy
npm audit
```

## Supabase

1. Tạo project Supabase.
2. Link project rồi chạy `npx supabase@latest db push` để áp dụng toàn bộ migration, gồm schema gốc, guest credentials, Swipe Match, Saved/History và production least-privilege grants.
3. Điền `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` và server-only `SUPABASE_SERVICE_ROLE_KEY`.
4. Bật Google provider trong Supabase Auth và thêm callback URL do Supabase cung cấp vào Google OAuth client.
5. Đặt Site URL và redirect URL cho local, preview và production trong Supabase Auth.

`SUPABASE_SERVICE_ROLE_KEY` chỉ dành cho các API server cần hỗ trợ guest session; tuyệt đối không import admin client vào Client Component.

## Google Places

1. Tạo Google Cloud project có billing và bật **Places API (New)**.
2. Chọn một cơ chế xác thực server:
   - `GOOGLE_PLACES_AUTH_MODE=api_key`: điền `GOOGLE_MAPS_API_KEY`, giới hạn API về Places API (New), và chỉ thêm IP restriction khi server có egress IP ổn định.
   - `GOOGLE_PLACES_AUTH_MODE=adc`: điền `GOOGLE_CLOUD_PROJECT_ID`, rồi cấu hình Application Default Credentials hoặc service account. Mode này dùng OAuth token ngắn hạn và phù hợp hơn khi IP thay đổi.
3. Với ADC trên máy local, chạy `gcloud auth application-default login` rồi `gcloud auth application-default set-quota-project <project-id>`.
4. Nếu sau này dùng Maps JavaScript API, tạo một browser key khác, giới hạn HTTPS referrer và chỉ cho Maps JavaScript API.

Không đưa API key, service account email/private key hoặc ADC credential vào biến `NEXT_PUBLIC_*`. Adapter hiện không cache phản hồi Google và không dùng wildcard Field Mask.

Local development dùng rate limiter trong memory. Khi deploy nhiều instance trên Vercel, điền `UPSTASH_REDIS_REST_URL` và `UPSTASH_REDIS_REST_TOKEN` để giới hạn 10 search/phút/actor được dùng chung giữa các instance.

## Tài liệu

- [Kiến trúc tổng thể](docs/architecture.md)
- [Database schema và RLS](docs/database-schema.md)
- [Folder structure](docs/folder-structure.md)
- [Báo cáo STEP 1–6](docs/implementation-steps-1-6.md)
- [Báo cáo STEP 7](docs/implementation-step-7.md)
- [Báo cáo STEP 8](docs/implementation-step-8.md)
- [Báo cáo STEP 9](docs/implementation-step-9.md)
- [Báo cáo STEP 10](docs/implementation-step-10.md)
- [Báo cáo STEP 11](docs/implementation-step-11.md)
- [Báo cáo STEP 12](docs/implementation-step-12.md)
- [Báo cáo STEP 13](docs/implementation-step-13.md)
- [Báo cáo STEP 14](docs/implementation-step-14.md)
- [Báo cáo STEP 15](docs/implementation-step-15.md)
- [Runbook deploy Vercel](docs/deployment-vercel.md)

## Trạng thái roadmap

MVP STEP 1–15 đã qua production gate trong repository. Việc phát hành public còn cần điền production secrets/domain, cấu hình Google OAuth/quota alert và import repository vào Vercel theo runbook. Decision modes mở rộng, merchant portal và community upload/OCR vẫn là post-MVP.
