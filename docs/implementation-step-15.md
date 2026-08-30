# Implementation report — STEP 15

## Outcome

MVP đã có production gate có thể chạy lặp lại ở local và GitHub Actions:

```text
commit / pull request
  ├─ quality: production build → lint → TypeScript → 68 unit/contract tests
  ├─ browser: Pixel 7 E2E → Axe WCAG → PWA/security checks → Lighthouse median
  └─ database: Supabase local migrations → pgTAP RLS/grants tests
```

Deploy vẫn là thao tác có chủ đích vì cần production domain/secrets. Runbook đầy đủ ở [deployment-vercel.md](deployment-vercel.md).

## Security hardening

- CSP giới hạn default/script/style/image/connect/worker/manifest origins; cấm object, base URL lạ và framing.
- HSTS chỉ bật production; thêm COOP, CORP, MIME sniffing, referrer, clickjacking, DNS prefetch và Permissions Policy.
- `/api/health` trả `503 degraded` trong production nếu thiếu Supabase public/admin hoặc Google Places; không probe Places nên không phát sinh API cost.
- `src/instrumentation.ts` ghi structured request errors vào Vercel stderr nhưng loại bỏ cookies, headers và query string.
- Migration `202608300003_production_security.sql` revoke grants mặc định rồi grant lại tối thiểu. Couple members/candidates/swipes/credentials và transactional RPC chỉ service role truy cập.
- Supabase local đặt `auto_expose_new_tables = false`; bảng mới phải có grant rõ ràng.
- Full `npm audit` sạch 0 vulnerability; production và dev/test dependency đều được kiểm tra.

## Browser, accessibility and PWA gate

Playwright chạy bundle production ở cổng riêng, viewport Pixel 7:

- Home, Food Wizard và bottom navigation smoke flow;
- xác nhận không gọi Geolocation khi user chưa bấm;
- manifest/install icons và maskable icon;
- service worker header/scope, đăng ký production, offline shell;
- service worker source giữ `/api/*` và Google Places/photo content ngoài cache;
- CSP/HSTS/security headers;
- Axe không có serious/critical WCAG 2/2.1 A/AA violation trên Home và Explore.

Accessibility gate đã dẫn tới thay đổi thật: bỏ khóa zoom viewport, làm primary coral đậm hơn và tăng contrast text trên nền primary.

## Performance

Lighthouse CI chạy mobile preset ba lần mỗi route và assert theo median, không lấy lần tốt nhất. Kết quả production cuối:

| Route | Performance | Accessibility | Best Practices | SEO |
|---|---:|---:|---:|---:|
| `/` | 99 | 100 | 100 | 100 |
| `/explore` | 95–96 | 100 | 96 | 100 |

Build dùng `next build --webpack` để ổn định trên môi trường Fedora/CI nơi Turbopack PostCSS worker không được bind cổng nội bộ. Development vẫn dùng Turbopack qua `next dev`.

## Database verification

- Production security migration đã apply lên linked Supabase project.
- `supabase db lint --linked`: không có schema error.
- pgTAP suite có 28 assertions cho RLS, table privileges và RPC execute privileges.
- Máy phát triển hiện không có Docker, vì vậy suite pgTAP được đưa vào job `database` trên GitHub-hosted runner thay vì tuyên bố đã chạy local.

## Files created

- `.github/workflows/ci.yml`
- `docs/deployment-vercel.md`
- `docs/implementation-step-15.md`
- `e2e/home.spec.ts`
- `e2e/pwa.spec.ts`
- `lighthouserc.cjs`
- `playwright.config.ts`
- `src/app/robots.ts`
- `src/instrumentation.ts`
- `supabase/migrations/202608300003_production_security.sql`
- `supabase/tests/database/001_security.test.sql`
- `vercel.json`

## Files materially updated

- `.gitignore`, `package.json`, `package-lock.json`
- `next.config.ts`
- `src/app/api/health/route.ts`
- `src/app/globals.css`, `src/app/layout.tsx`, `src/app/page.tsx`
- `src/components/service-worker-register.tsx`
- `src/features/couple/components/couple-room.tsx`
- `supabase/config.toml`
- `README.md`, `docs/architecture.md`, `docs/database-schema.md`, `docs/folder-structure.md`

## Commands

```bash
npm run build
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run lighthouse
npm audit
npx supabase@latest db lint --linked
```

Khi Docker/Supabase local khả dụng:

```bash
npx supabase@latest start
npm run test:db
```
