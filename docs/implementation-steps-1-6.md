# Implementation report — STEP 1 → STEP 6

Toàn bộ “complete code” của mỗi file nằm trực tiếp trong repository; danh sách dưới đây là manifest bàn giao và quyết định kiến trúc ngắn gọn.

## STEP 1 — System Architecture

Files:

- `docs/architecture.md`
- `README.md`

Kiến trúc dùng Next.js như BFF để không lộ Places secret, tách bounded contexts và đặt compliance boundary tại provider/service worker/database. Mermaid system diagram và user flow có trong tài liệu kiến trúc.

## STEP 2 — Database schema

Files:

- `supabase/migrations/202608290001_initial_schema.sql`
- `docs/database-schema.md`

Migration tạo enum/table/index/trigger/RLS thực thi được. Chỉ Place ID được lưu từ Google; swipe tables không có client read policy để giữ lựa chọn kín.

## STEP 3 — Folder structure

Files:

- `docs/folder-structure.md`

Structure phân tách route/UI/feature/service/infrastructure/domain types. Tài liệu ghi cả tree hiện tại và target MVP để các step sau thêm module đúng boundary.

## STEP 4 — Next.js + TypeScript + Tailwind + shadcn/ui + Supabase

Files:

- `.gitignore`, `.env.example`, `.npmrc`
- `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `vitest.config.ts`, `components.json`
- `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`
- `src/app/explore/page.tsx`, `src/app/matches/page.tsx`, `src/app/saved/page.tsx`, `src/app/profile/page.tsx`
- `src/app/auth/callback/route.ts`, `src/app/auth/auth-code-error/page.tsx`, `src/app/api/health/route.ts`
- `src/components/app-logo.tsx`, `src/components/bottom-navigation.tsx`, `src/components/coming-soon-page.tsx`
- `src/components/ui/button.tsx`, `src/components/ui/card.tsx`
- `src/features/auth/actions.ts`
- `src/lib/utils.ts`, `src/lib/env/client.ts`, `src/lib/env/server.ts`
- `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/admin.ts`, `src/lib/supabase/proxy.ts`
- `src/proxy.ts`

App Router mobile shell chạy guest không cần env. Supabase SSR refresh auth qua Next 16 proxy; Google OAuth và service role nằm ở server boundaries. shadcn foundation dùng CSS variables, Radix Slot và CVA, với touch target tối thiểu 44px.

## STEP 5 — PWA manifest + service worker

Files:

- `src/app/manifest.ts`
- `src/app/offline/page.tsx`
- `src/components/service-worker-register.tsx`
- `src/components/install-prompt.tsx`
- `public/sw.js`
- `public/icons/app-icon.svg`
- `public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/icons/icon-maskable-512.png`

Service worker precache app shell và cache versioned static assets; navigation, API và Google content không runtime-cache. Install CTA xuất hiện sau khi user đã dùng app, hỗ trợ Android prompt và hướng dẫn iOS.

## STEP 6 — Google Places abstraction

Files:

- `src/types/place.ts`
- `src/services/places/place-provider.ts`
- `src/services/places/index.ts`
- `src/services/places/google/field-masks.ts`
- `src/services/places/google/google-places.schemas.ts`
- `src/services/places/google/google-places.mapper.ts`
- `src/services/places/google/google-places.provider.ts`
- `src/services/places/google/google-places.mapper.test.ts`
- `src/services/places/google/google-places.provider.test.ts`

`PlaceProvider` là vendor-neutral contract. Google adapter hỗ trợ Nearby/Text Search, Place Details và Place Photos; dùng Zod, timeout, bounded photo concurrency, explicit Field Mask và `cache: no-store`. Exact rating/radius/review filters được áp dụng mà không đổi Google order. Photo/review author attribution được giữ trong domain model để UI tương lai bắt buộc render đúng.

## Chưa thuộc phạm vi STEP 1–6

Food Wizard, public search/detail API, restaurant cards, MenuResolver implementation và couple/swipe/save APIs chưa được giả lập. Đây là STEP 7–14 theo đúng thứ tự được yêu cầu; placeholder route hiện chỉ xác nhận app shell và navigation.
