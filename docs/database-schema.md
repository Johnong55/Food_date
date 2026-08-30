# Database schema & access model

Schema thực thi nằm trong [thư mục migrations](../supabase/migrations/), gồm schema gốc, credential/RPC STEP 12, transaction Swipe Match STEP 13, hardening Saved/History STEP 14 và least-privilege grants STEP 15. PostgreSQL/Supabase chỉ lưu application-owned data và `google_place_id`; không có bảng cache Google Places Content.

## Bảng và invariants

| Table | Vai trò | Invariant quan trọng |
|---|---|---|
| `profiles` | projection của `auth.users` | tạo tự động bằng trigger; user chỉ đọc/sửa mình |
| `user_preferences` | sở thích bền vững | min ≤ max; weights bắt buộc JSON object |
| `collections` | nhóm địa điểm đã lưu | tên unique theo user |
| `saved_places` | bookmark Place ID | unique theo user/place/collection; không copy tên/rating |
| `couple_sessions` | vòng đời phiên | đúng một creator user hoặc guest; code case-insensitive; có expiry |
| `session_members` | identity trong phiên | đúng một `user_id` hoặc `guest_id`; preference JSON object |
| `session_member_credentials` | quyền guest theo phiên | chỉ SHA-256 token hash; expiry/revocation; không có client policy |
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
- Guest token thô không đi vào DB. Migration STEP 12 thêm `session_member_credentials`; các transaction RPC chỉ cấp quyền cho service role.
- Migration STEP 15 revoke quyền mặc định trước khi grant lại tối thiểu: anon chỉ đọc menu visible, authenticated chỉ quản lý dữ liệu account-owned/menu contribution; toàn bộ couple tables/RPC vẫn server-only.
- `supabase/tests/database/001_security.test.sql` kiểm tra RLS của mọi bảng exposed, table grants và function execute grants bằng pgTAP trong CI.

## Transaction boundaries cho STEP 12–14

- `create session`: session + creator member + hashed credential trong một RPC transaction — implemented.
- `join`: lock session, kiểm tra expiry/status/member limit, insert member idempotently — implemented.
- `set preferences`: lock session, update readiness/status và xóa cascade candidate/swipe cũ nếu preference đổi; intersection được tính từ hai payload đã validate mà không persist bản tổng hợp — implemented.
- `initialize candidates`: lock session, kiểm tra đúng hai member đã sẵn sàng và insert tối đa 10 Place ID đúng một lần; race giữa hai client không thay deck — implemented.
- `swipe`: validate candidate, upsert own swipe và detect hai positive decisions trong một database function/transaction; response chỉ chứa match khi điều kiện hai phía đã đạt — implemented.
- `save`: verify collection owner và insert idempotent; move vào collection trùng sẽ merge record thay vì tạo duplicate — implemented qua user-scoped Data API + RLS.
- `history`: insert/delete rating, note, visit time và approximate cost do user nhập; không mirror tên/rating Google — implemented qua user-scoped Data API + RLS.

## Retention

- Cron đánh dấu/xóa session hết hạn và credential/token theo retention policy sẽ được cấu hình ở production gate; API hiện từ chối session quá hạn và lazily đánh dấu `expired`.
- Place ID nên được refresh khi cũ hơn 12 tháng theo hướng dẫn Google.
- Menu user/merchant có audit, provenance và soft-delete/versioning ở phase portal; ảnh trong Supabase Storage có ownership policy riêng.
- Chức năng reset personalization xóa `preference_weights` và các inferred fields, không xóa explicit saved/history nếu user không chọn.
