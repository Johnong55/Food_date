# Implementation report — STEP 12

## Outcome

Couple Session đã thay thế màn Matches placeholder và hoạt động cho cả guest lẫn tài khoản Supabase:

```text
/matches
  → tạo session hoặc nhập code
  → POST /api/couple/session
  → share /join/:code
  → POST /api/couple/session/:code/join
  → mỗi người submit preference riêng
  → transaction cập nhật readiness
  → chỉ trả shared intersection khi cả hai hoàn tất
```

Room `/couple/[code]` poll trạng thái application-owned mỗi 5 giây trong lúc chờ, dừng khi có intersection. Preference riêng của partner không bao giờ có trong API response.

## Guest credential model

- Session code là locator/share code, không phải credential.
- Guest nhận token 256-bit từ `node:crypto` trong cookie theo từng session.
- Cookie là `HttpOnly`, `SameSite=Lax`, `Secure` ở production và hết hạn cùng session sau 24 giờ.
- PostgreSQL chỉ lưu SHA-256 hash 64 ký tự trong `session_member_credentials`; raw token không vào DB/log/client JavaScript.
- Signed-in member được xác thực bằng `supabase.auth.getUser()` và membership `user_id`.
- Credential table không có client RLS policy. Ba transaction RPC bị revoke khỏi `public`, `anon`, `authenticated` và chỉ grant cho `service_role`.

Migration mới: `supabase/migrations/202608290002_couple_session_credentials.sql`.

## Transaction boundaries

- `create_couple_session`: session + creator member + guest credential trong một transaction; code collision được retry tối đa năm lần.
- `join_couple_session`: lock session row, kiểm tra expiry/status và giới hạn đúng hai member trước khi insert.
- `set_couple_member_preferences`: lock session, update preference, đếm readiness và chuyển status sang `swiping` khi đủ hai người.

Các function dùng `security definer` với `search_path = ''` và tên bảng fully-qualified.

## Privacy-safe intersection

Chỉ khi hai preference đều hợp lệ, server mới tạo:

- cuisine/mood mềm: phần giao;
- maximum budget và radius: lấy giới hạn chặt hơn;
- minimum Google rating/review count: lấy ngưỡng cao hơn;
- `open_now` và `vegetarian_friendly`: hợp các yêu cầu bắt buộc của cả hai;
- tiện ích mềm khác: phần giao;
- cùng khu vực: dùng khu vực đó; khác khu vực: midpoint của hai tâm quận công khai.

Couple Mode chỉ chấp nhận khu vực thủ công trong allowlist TP.HCM và server ghi đè label/coordinates theo constants tin cậy. API không nhận GPS chính xác cho subsystem này. Response ghi rõ đây là logic “Độ phù hợp” của ứng dụng, không phải Google Score.

Nếu không có cuisine chung, response giữ mảng rỗng và UI yêu cầu chỉnh lựa chọn; engine không tự bịa hoặc dùng union mà không báo.

## APIs

| Endpoint | Auth | Rate limit | Hành vi |
|---|---|---:|---|
| `POST /api/couple/session` | guest/user | 5/giờ/actor | tạo session + creator membership |
| `GET /api/couple/session/:code` | member | 60/phút/actor | own state, peer readiness, intersection nếu đủ |
| `POST /api/couple/session/:code/join` | guest/user | 15/10 phút/actor | join tối đa hai người, idempotent cho member hiện hữu |
| `POST /api/couple/session/:code/preferences` | member | 20/phút/actor | validate + transaction update |

Rate-limit keys là actor-global theo operation, không gắn từng code, nhằm tránh code enumeration bằng cách đổi code liên tục. Tất cả response là `private, no-store` và có request ID.

## UX

- `/matches`: tạo session, nhập tên hoặc code mời.
- Home có CTA Couple Mode dẫn trực tiếp vào luồng tạo phiên.
- `/join/[code]`: trang share-link tối giản, tham gia bằng một tay.
- `/couple/[code]`: copy code, Web Share/copy fallback, expiry, readiness hai member.
- Preference form: tối đa ba cuisine, budget max, radius, khu vực, mood, Google rating/review threshold và options.
- Sau khi submit, UI chỉ nói “đã khóa lựa chọn của bạn” trong lúc chờ; không hé lộ lựa chọn partner.
- Khi đủ hai người, summary hiển thị các hard constraints và shared preferences; người dùng có thể sửa phần của mình.

Candidate generation và swipe kín thuộc STEP 13; STEP 12 chỉ chuyển session sang trạng thái `swiping` khi đủ dữ liệu.

## Files created

- `supabase/migrations/202608290002_couple_session_credentials.sql`
- `src/types/couple.ts`
- `src/lib/http/read-json-body.ts`
- `src/services/couple/couple-credential.ts`
- `src/services/couple/couple-credential.test.ts`
- `src/services/couple/couple-session.service.ts`
- `src/features/couple/couple-contract.ts`
- `src/features/couple/couple-contract.test.ts`
- `src/features/couple/couple-intersection.ts`
- `src/features/couple/couple-intersection.test.ts`
- `src/features/couple/api/couple-route.ts`
- `src/features/couple/api/couple-session.ts`
- `src/features/couple/components/couple-lobby.tsx`
- `src/features/couple/components/join-couple-session.tsx`
- `src/features/couple/components/couple-room.tsx`
- `src/features/couple/components/couple-preference-form.tsx`
- `src/features/couple/components/couple-intersection-summary.tsx`
- `src/app/api/couple/session/route.ts`
- `src/app/api/couple/session/[code]/route.ts`
- `src/app/api/couple/session/[code]/join/route.ts`
- `src/app/api/couple/session/[code]/preferences/route.ts`
- `src/app/join/[code]/page.tsx`
- `src/app/couple/[code]/page.tsx`
- `src/app/couple/[code]/loading.tsx`
- `docs/implementation-step-12.md`

## Files updated

- `src/app/matches/page.tsx`
- `src/app/page.tsx`
- `src/components/bottom-navigation.tsx`
- `src/lib/env/server.ts`
- `README.md`
- `docs/architecture.md`
- `docs/database-schema.md`
- `docs/folder-structure.md`

## Verification

- `npm run typecheck`
- `npm run lint`
- `npm test` — 25 files, 62 tests trước production build
- page smoke: `/matches`, `/join/AB12CD`, `/couple/AB12CD` đều HTTP 200
- API smoke khi thiếu backend: controlled `COUPLE_NOT_CONFIGURED` HTTP 503, no-store, request/rate headers
- `npm run build`

Để chạy end-to-end, apply cả hai migration theo thứ tự và cấu hình ba biến Supabase trong `.env.local`. Không cần đăng nhập để guest session hoạt động.
