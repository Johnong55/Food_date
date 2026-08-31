# Production deployment — Vercel + Supabase

## 1. Preconditions

- `main` passes GitHub Actions: lint, TypeScript, unit/contract tests, production build, Playwright and Lighthouse.
- All files in `supabase/migrations` have been reviewed and applied to the linked Supabase project.
- Google Cloud billing budget and Places API (New) quota alerts are configured.
- Production domain is known before configuring OAuth redirects.

The repository pins Vercel Functions to `syd1`, close to the current Supabase database in Sydney. Static assets remain served by Vercel's global CDN.

## 2. Apply database migrations

From a trusted workstation authenticated with the Supabase CLI:

```bash
npx supabase@latest link --project-ref <project-ref>
npx supabase@latest db lint --linked
npx supabase@latest db push
```

Then run the local database security suite when Docker is available:

```bash
npx supabase@latest start
npm run test:db
```

Migration `202608300003_production_security.sql` is the permission boundary for production. It keeps public verified menu reads, gives authenticated users only account-owned CRUD, and makes all couple membership/candidate/swipe tables and RPCs server-only.

## 3. Configure Supabase Auth

In **Authentication → URL Configuration**:

- Site URL: `https://<production-domain>`
- Redirect URLs:
  - `http://localhost:3000/auth/callback`
  - `https://<production-domain>/auth/callback`
  - add only preview deployment URLs that the team explicitly trusts

In **Authentication → Providers → Google**, enable Google and enter the Google OAuth client credentials. In Google Cloud, the authorized redirect URI for that OAuth client is:

```text
https://<project-ref>.supabase.co/auth/v1/callback
```

Do not use the Google Places key as the OAuth client secret.

## 4. Configure Google Cloud

Enable **Places API (New)** and choose one server authentication strategy:

- OAuth/ADC (recommended when egress IPs vary): create a least-privilege service account, grant it `Service Usage Consumer` on this project, and store its email/private key only in encrypted Vercel server environment variables. Prefer Workload Identity Federation when the deployment platform supports it.
- API key: restrict it to Places API (New), and use static egress IP restriction only if the Vercel plan provides stable egress; never add an invalid IP restriction that breaks production.
- Quotas/budget: configure daily budget alerts and review Places SKU usage after launch.
- Keep Maps JavaScript API disabled until a real in-app map is shipped. If enabled later, create a separate browser key restricted by production HTTPS referrers.

The server adapter requests explicit Field Masks and uses `Cache-Control: no-store`. It does not persist Google names, ratings, reviews, addresses, photos or opening hours.

## 5. Import the GitHub repository into Vercel

Use these settings:

| Setting | Value |
|---|---|
| Framework | Next.js (auto-detected) |
| Node.js | 22.x |
| Install command | `npm ci` |
| Build command | `npm run build` |
| Function region | `syd1` from `vercel.json` |

Set production environment variables:

```text
NEXT_PUBLIC_SITE_URL=https://<production-domain>
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable-or-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<server-only-service-role-key>
GOOGLE_PLACES_AUTH_MODE=api_key
GOOGLE_MAPS_API_KEY=<server-only-places-key>
UPSTASH_REDIS_REST_URL=<optional-but-recommended-for-multi-instance>
UPSTASH_REDIS_REST_TOKEN=<optional-but-recommended-for-multi-instance>
```

For OAuth/ADC instead of an API key, replace `GOOGLE_MAPS_API_KEY` with:

```text
GOOGLE_PLACES_AUTH_MODE=adc
GOOGLE_CLOUD_PROJECT_ID=<google-cloud-project-id>
GOOGLE_SERVICE_ACCOUNT_EMAIL=<server-only-service-account-email>
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

In API-key mode, set `GOOGLE_PLACES_AUTH_MODE=api_key`. In OAuth mode the adapter sends a short-lived Bearer token and the quota project header; the private key is never returned to the browser.

Never expose the service-role or Places server key with a `NEXT_PUBLIC_` prefix. Use separate values for Preview when Preview connects to a separate Supabase project; otherwise disable state-changing preview access.

## 6. Release checks

After deployment:

```bash
curl -i https://<production-domain>/api/health
curl -i https://<production-domain>/manifest.webmanifest
curl -i https://<production-domain>/sw.js
```

Expected:

- `/api/health` returns `200`, `ready: true` and all three service flags are true.
- HTML has CSP, HSTS, clickjacking, MIME-sniffing, referrer and permissions headers.
- manifest returns the 192px, 512px and maskable icons.
- service worker is revalidated and declares scope `/`.
- guest discovery, Google login, Save, History, couple join, private swipe and match are exercised on real mobile Safari and Chrome.

## 7. Monitoring and incident response

- Vercel Function logs receive structured `next_request_error` records without cookies, headers or query strings.
- Alert when `/api/health` is non-200 for two consecutive checks.
- Watch 429/503 rates, Google Places quota/billing and Supabase Auth/database errors.
- Use Upstash in production so cost protection is shared across function instances.
- Rotate any secret immediately if it appears in logs, screenshots, Git history or client bundles.

For an application regression, promote the previous healthy Vercel deployment. Database migrations are forward-only; create a corrective migration instead of editing an already-applied migration or resetting production data.
