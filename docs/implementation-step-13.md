# Implementation report — STEP 13

## Outcome

Couple Session hiện đi hết luồng preference → candidate deck → swipe kín → mutual match:

```text
shared intersection
  → explicit “Tạo bộ quán chung”
  → Places API (New), tối đa 10 kết quả theo thứ tự Google
  → DB chỉ lưu Place ID + google_result_position
  → mỗi member swipe left/right/super_like
  → PostgreSQL transaction phát hiện hai positive decisions
  → 🎉 MATCH; không tiết lộ peer decision trước đó
```

Nội dung Google Places chỉ tồn tại trong response `private, no-store` và React state; không ghi PostgreSQL, localStorage, IndexedDB hay Service Worker cache.

## Database transactions

Migration `202608300001_swipe_match.sql` thêm:

- `initialize_couple_candidates`: lock session, xác minh membership/readiness, giới hạn 1–10 Place ID unique và first-writer-wins khi hai client khởi tạo cùng lúc;
- `record_couple_swipe`: lock session, xác minh candidate, upsert quyết định riêng và phát hiện match atomic;
- thay thế `set_couple_member_preferences`: mọi lần sửa preference xóa candidate cũ, cascade swipe cũ và tạo lại intersection sạch.

Hai RPC mới bị revoke khỏi `public`, `anon`, `authenticated` và chỉ grant cho `service_role`. Client không có RLS policy đọc trực tiếp `session_candidates` hoặc `swipes`.

## Google Places and hard filters

- Candidate list không custom rerank; giữ thứ tự Google sau exact filters.
- Field Mask vẫn explicit, không dùng `*`.
- `servesVegetarianFood` chỉ được request khi vegetarian là hard filter; kết quả unknown/false bị loại.
- `openNow`, radius, Google rating và review count được filter chính xác.
- Budget VND/người chưa thể suy ra chính xác từ Google `priceLevel`; UI ghi rõ chưa xác minh và không tuyên bố quán nằm trong ngân sách. App không tự nới budget.
- Khi một response search lặp lại thiếu candidate đã khóa, server mới dùng Place Details on-demand cho ID thiếu; không persist response.

## Privacy and UX

- Response deck chứa own decisions và mutual matched IDs, không chứa peer decisions hoặc peer progress.
- Match chỉ lộ Place ID khi cả hai đã right/super-like.
- Card mobile-first hỗ trợ pointer swipe ngang và ba nút tối thiểu 48–56px.
- Mutation dùng optimistic advance; lỗi/timeout hoàn tác đúng card.
- Member đã swipe xong poll match mỗi 5 giây với endpoint rate-limited.
- Match dialog có Đi luôn, Xem menu và Tìm thêm.

## APIs

| Endpoint | Rate limit | Hành vi |
|---|---:|---|
| `POST /api/couple/session/:code/candidates` | 10/5 phút/actor | tạo/đọc canonical deck và trả fresh Places summaries |
| `POST /api/couple/session/:code/swipe` | 60/phút/actor | validate + atomic own swipe/match |
| `GET /api/couple/session/:code/matches` | 30/phút/actor | own progress + mutual matches only |

## Verification

- TypeScript strict và ESLint pass.
- 27 test files / 66 tests pass trước migration validation.
- Unit tests xác nhận peer choices không xuất hiện trong own state và vegetarian Field Mask chỉ bật theo hard filter.
- Migration được kiểm tra bằng Supabase CLI trước khi push remote.
