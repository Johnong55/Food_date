# Implementation report — STEP 7

## Outcome

Home đã nối vào Food Preference Wizard mobile-first tại `/explore?intent=food`. Wizard tạo `FoodSearchDraft` đã validate, sẵn sàng làm input cho Search API ở STEP 8 nhưng chưa gọi hoặc bịa dữ liệu nhà hàng.

## Luồng UX

1. Chọn tối đa 3 loại món; Random là lựa chọn độc lập.
2. Chọn tối đa 4 mood.
3. Chọn ngân sách/người, Google rating và số review tối thiểu.
4. Chọn vị trí hiện tại bằng thao tác chủ động hoặc tìm/chọn khu vực TP.HCM; chọn radius.
5. Chọn options, xem tóm tắt và tạo search draft.

Back giữ nguyên state, reset đưa wizard về đầu. CTA cố định ngay phía trên bottom navigation để thao tác một tay. Mỗi control có touch target ít nhất 44px, `aria-pressed` hoặc `role=switch`, progress semantics và location error state.

## Privacy và compliance

- Không gọi `navigator.geolocation` khi mount; chỉ gọi sau nút “Dùng vị trí của tôi”.
- Tọa độ chỉ nằm trong React state ở STEP 7, không tự persist hoặc gửi đi.
- Rating được ghi rõ là Google rating; chưa tạo hoặc hiển thị match score.
- Budget chưa được khẳng định là hard filter nếu menu/price data không đủ tin cậy.
- Các intent ngoài food hiển thị roadmap state, không tạo kết quả giả.

## Files created

- `src/features/discovery/types.ts`
- `src/features/discovery/constants.ts`
- `src/features/discovery/preference-schema.ts`
- `src/features/discovery/preference-reducer.ts`
- `src/features/discovery/hooks/use-current-location.ts`
- `src/features/discovery/components/selection-chip.tsx`
- `src/features/discovery/components/step-heading.tsx`
- `src/features/discovery/components/wizard-header.tsx`
- `src/features/discovery/components/cuisine-step.tsx`
- `src/features/discovery/components/mood-step.tsx`
- `src/features/discovery/components/budget-step.tsx`
- `src/features/discovery/components/location-picker.tsx`
- `src/features/discovery/components/location-step.tsx`
- `src/features/discovery/components/options-step.tsx`
- `src/features/discovery/components/discovery-ready.tsx`
- `src/features/discovery/components/food-preference-wizard.tsx`
- `src/features/discovery/preference-reducer.test.ts`
- `src/features/discovery/preference-schema.test.ts`
- `src/app/explore/loading.tsx`

## Files updated

- `src/app/explore/page.tsx`
- `README.md`

## Verification

Các lệnh bắt buộc trước bàn giao:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

STEP 8 sẽ nhận `FoodSearchDraft`, validate lại ở server boundary, rate-limit, map hợp lệ sang `PlaceSearchRequest` và trả Places Content với `Cache-Control: private, no-store`.
