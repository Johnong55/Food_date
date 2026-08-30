# Folder structure

## Cấu trúc hiện tại (STEP 1–14)

```text
.
├── docs/
│   ├── architecture.md
│   ├── database-schema.md
│   ├── folder-structure.md
│   ├── implementation-step-7.md
│   ├── implementation-step-8.md
│   ├── implementation-step-9.md
│   ├── implementation-step-10.md
│   ├── implementation-step-11.md
│   ├── implementation-step-12.md
│   ├── implementation-step-13.md
│   ├── implementation-step-14.md
│   ├── implementation-step-15.md
│   ├── deployment-vercel.md
│   └── implementation-steps-1-6.md
├── e2e/                         # production mobile/PWA/a11y browser tests
├── public/
│   ├── icons/
│   └── sw.js
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── couple/session/
│   │   │   ├── collections/
│   │   │   ├── history/
│   │   │   ├── menu/resolve/
│   │   │   ├── health/
│   │   │   ├── place/
│   │   │   │   ├── [placeId]/
│   │   │   │   │   └── menu/
│   │   │   │   └── photo/
│   │   │   ├── saved/
│   │   │   └── search/
│   │   ├── auth/
│   │   ├── couple/[code]/
│   │   ├── explore/
│   │   ├── history/
│   │   ├── matches/
│   │   ├── menu/[placeId]/
│   │   ├── join/[code]/
│   │   ├── offline/
│   │   ├── profile/
│   │   ├── restaurant/[placeId]/
│   │   ├── saved/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── manifest.ts
│   │   ├── robots.ts
│   │   └── page.tsx
│   ├── components/
│   │   └── ui/
│   ├── features/
│   │   ├── auth/
│   │   ├── couple/
│   │   │   ├── api/
│   │   │   └── components/
│   │   ├── discovery/
│   │   │   ├── api/
│   │   │   ├── components/
│   │   │   └── hooks/
│   │   ├── menu/
│   │   │   ├── api/
│   │   │   └── components/
│   │   ├── restaurant/
│   │   │   ├── api/
│   │   │   ├── components/
│   │   │   └── hooks/
│   │   └── saved/
│   │       ├── api/
│   │       ├── components/
│   │       └── hooks/
│   ├── lib/
│   │   ├── env/
│   │   ├── http/
│   │   ├── geo/
│   │   ├── rate-limit/
│   │   └── supabase/
│   ├── services/
│   │   ├── couple/
│   │   ├── discovery/
│   │   ├── menu-resolver/
│   │   │   ├── parsers/
│   │   │   ├── providers/
│   │   │   └── safe-fetch/
│   │   ├── places/
│   │   │   └── google/
│   │   └── saved/
│   ├── types/
│   ├── instrumentation.ts       # sanitized structured request-error logs
│   └── proxy.ts
├── supabase/
│   ├── migrations/
│   └── tests/database/          # pgTAP grants/RLS regression suite
├── .github/workflows/ci.yml
├── .env.example
├── components.json
├── lighthouserc.cjs
├── next.config.ts
├── package.json
├── playwright.config.ts
├── vercel.json
└── tsconfig.json
```

## Cấu trúc target của MVP

```text
src/
├── app/                         # route composition; không chứa business logic
│   ├── api/
│   │   ├── search/
│   │   ├── place/[placeId]/
│   │   ├── menu/resolve/
│   │   ├── couple/session/
│   │   └── saved/
│   ├── restaurant/[placeId]/
│   ├── menu/[placeId]/
│   └── join/[code]/
├── components/
│   ├── ui/                      # shadcn primitives
│   └── shared/                  # generic composed UI
├── features/
│   ├── discovery/               # wizard, location, filters, result state
│   ├── restaurant/              # card, detail, Google attribution
│   ├── menu/                    # menu UI + provenance
│   ├── couple/                  # create/join/intersection
│   ├── swipe/                   # deck and match animation
│   ├── decision/                # quick pick, roulette, battle
│   ├── saved/                   # optimistic save + collections
│   ├── history/
│   ├── profile/
│   └── auth/
├── services/
│   ├── places/                  # PlaceProvider contract + adapters
│   ├── menu-resolver/           # resolver + provider chain
│   ├── recommendation/          # hard filters; policy-gated soft logic
│   ├── couple/                  # transactional use-cases
│   └── crawler/                 # robots, SSRF-safe fetcher, parsers
├── lib/
│   ├── database/
│   ├── supabase/
│   ├── env/
│   ├── auth/
│   ├── rate-limit/
│   ├── observability/
│   └── pwa/
├── hooks/
├── stores/                      # ephemeral client state only
├── types/                       # vendor-neutral domain types
└── proxy.ts
```

## Dependency rules

1. `components/ui` không import feature/service.
2. `features` có thể import domain types và use-cases, không import Google raw types.
3. `services/places/google` là nơi duy nhất hiểu Google request/response fields.
4. `app/api` validate/auth/rate-limit rồi gọi service; không viết query business rải rác.
5. `lib/supabase/admin` và `services/places/index` là server-only boundary.
6. Client state chỉ giữ input/UI state; Places response không persist vào localStorage/IndexedDB.
