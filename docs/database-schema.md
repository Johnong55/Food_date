# Database schema & access model

Schema thực thi nằm ở [migration đầu tiên](../supabase/migrations/202608290001_initial_schema.sql). PostgreSQL/Supabase chỉ lưu application-owned data và `google_place_id`; không có bảng cache Google Places Content.

## Bảng và invariants

| Table | Vai trò | Invariant quan trọng |
|---|---|---|
| `profiles` | projection của `auth.users` | tạo tự động bằng trigger; user chỉ đọc/sửa mình |
| `user_preferences` | sở thích bền vững | min ≤ max; weights bắt buộc JSON object |
| `collections` | nhóm địa điểm đã lưu | tên unique theo user |
| `saved_places` | bookmark Place ID | unique theo user/place/collection; không copy tên/rating |
| `couple_sessions` | vòng đời phiên | đúng một creator user hoặc guest; code case-insensitive; có expiry |
| `session_members` | identity trong phiên | đúng một `user_id` hoặc `guest_id`; preference JSON object |
| `session_candidates` | tập Place ID để swipe | giữ `google_result_position`; không mirror card data |
| `swipes` | quyết định kín | unique member/place; FK candidate kép chống swipe ngoài session |
| `place_notes` | history cá nhân | rating 1–5; cost không âm; timeline index |
| `menus` | provenance menu app-owned | source enum, verified, fingerprint, source URL http/https |
| `menu_sections` | section có thứ tự | cascade theo menu |
| `menu_items` | món chuẩn hóa | price không âm; ISO currency; cascade theo section |

## RLS và trust boundary

- Profile, preference, collection, saved place và history có owner policies theo `auth.uid()`.
- Verified menu được đọc công khai; contributor chỉ quản lý menu chưa verified của chính mình. Verify là trusted backend/admin action.
- Couple session creator chỉ đọc metadata phiên do mình tạo trực tiếp. `session_members`, `session_candidates`, `swipes` không có client policies.
- Toàn bộ couple mutation/query đi qua Route Handler dùng service role sau khi xác thực opaque member token. Nhờ vậy user không thể query lựa chọn của người kia trước match.
- Guest token thô không đi vào DB. STEP 12 phải thêm bảng credential/hash hoặc trường hash qua migration riêng; migration hiện chỉ model `guest_id`, chưa mở API guest.

## Transaction boundaries cho STEP 12–14

- `create session`: session + creator member + hashed credential trong một transaction.
- `join`: lock session, kiểm tra expiry/status/member limit, insert member idempotently.
- `set preferences`: update member; nếu đủ thành viên, tính intersection và candidates trong một transaction/job boundary.
- `swipe`: upsert own swipe và detect match trong một database function/transaction; response chỉ chứa match khi điều kiện hai phía đã đạt.
- `save`: verify collection owner và insert/upsert; RLS hiện đã kiểm tra ownership.

## Retention

- Cron đánh dấu/xóa session hết hạn và credential/token theo retention policy.
- Place ID nên được refresh khi cũ hơn 12 tháng theo hướng dẫn Google.
- Menu user/merchant có audit, provenance và soft-delete/versioning ở phase portal; ảnh trong Supabase Storage có ownership policy riêng.
- Chức năng reset personalization xóa `preference_weights` và các inferred fields, không xóa explicit saved/history nếu user không chọn.
