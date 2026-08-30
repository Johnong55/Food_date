# Implementation report — STEP 14

## Outcome

Saved placeholder đã được thay bằng account-owned Collections và History hoàn chỉnh:

```text
Restaurant card/detail
  → optimistic Save (Place ID only)
  → /saved collections + move/delete
  → Places details tải lại theo viewport, private no-store

Restaurant detail
  → “Đã ghé quán”
  → rating cá nhân + ngày + note + approximate cost
  → /history timeline
```

Guest vẫn dùng discovery, menu và Couple Mode. Save/History yêu cầu login vì đây là dữ liệu đồng bộ dài hạn.

## Data and security

- API dùng Supabase server client gắn user session và RLS; không dùng admin/service role.
- Payload Save chỉ chấp nhận opaque `googlePlaceId` và optional owned `collectionId`.
- Supabase không lưu tên, địa chỉ, Google rating, review, photo hoặc opening hours.
- Saved/History UI dùng IntersectionObserver rồi gọi Place Details on-demand; response không được persist hoặc Service Worker cache.
- Collection ownership được xác minh trước insert/move; UUID/path/body đều validate bằng Zod.
- Save duplicate là idempotent. Move vào collection đã có cùng Place ID merge record hiện hữu.
- History giới hạn rating 1–5 theo bước 0.5, note 2.000 ký tự, cost không âm và không cho ngày tương lai.
- Tất cả endpoints có actor rate limiting, `private, no-store`, request ID và bounded request body.

Migration `202608300002_saved_history_hardening.sql` thêm case-insensitive collection uniqueness, Place ID lookup index, profile trigger an toàn với metadata dài/rỗng và backfill auth users hiện hữu.

## UX

- Restaurant Cards và Detail có “Lưu quán” với optimistic rollback và login fallback.
- Detail có bottom sheet “Đã ghé quán” tối ưu một tay.
- `/saved`: create/filter/delete collections, move và remove saved place.
- `/history`: mobile timeline ngày/tháng, personal rating, note, cost và link mở lại detail.
- Xóa/move dùng optimistic UI; lỗi trả record về đúng trạng thái trước mutation.
- Xóa collection không xóa saved place; PostgreSQL đặt `collection_id = null`.

## APIs

| Endpoint | Hành vi |
|---|---|
| `GET/POST /api/saved` | list/status và save Place ID |
| `PATCH/DELETE /api/saved/:id` | move/merge collection và unsave |
| `GET/POST /api/collections` | list/create collection |
| `DELETE /api/collections/:id` | delete owned collection |
| `GET/POST /api/history` | timeline/create visit |
| `DELETE /api/history/:id` | delete owned visit |

## Verification

- TypeScript strict pass.
- ESLint pass.
- 28 test files / 68 tests pass.
- Contract tests xác nhận Save không nhận Google content và History từ chối note quá dài.
- Migration đã apply lên remote, Supabase schema lint không có lỗi và production build pass.
