# Product Catalogue PoC: Implementation Spec

> **Version 3 · 2026-11-20.** This is the source of truth for humans and AI agents building this project. Version 3 incorporates an independent architecture review; the triage is in §17.3.
> Where this spec and the challenge brief disagree, **the brief wins**: record the conflict in `DECISIONS.md`.
> Facts marked ✅ were verified against the live Fake Store API and the npm registry on 2026-11-20.

---

## 0. How to use this spec (AI agents: read this first)

1. **Work phase by phase** (§16). Don't start a phase until the previous one's Definition of Done passes.
2. **Every task ends green**: `npm run verify` passes before each commit (§15.5).
3. **Build only what is in scope** (§2). Items under Won't are deliberate decisions, not extras waiting to be added.
4. **If the spec is silent**, pick the simplest option consistent with §3–§9, add it to `DECISIONS.md` → *Assumptions (agent)*, and keep going. Stop and ask only if it would contradict the brief.
5. **Library versions are newer than most AI training data.** Use the versions in §15.1. If you are unsure of an API, read the installed package's types or README in `node_modules` before writing code. Never downgrade a library to match a remembered API.
6. **No interfaces beyond the ports in §5.2.** Services, mappers and presenters are concrete.
7. **Integrity:** agents never write or edit *time spent*, and never invent entries for the AI mistake log or key prompts. Agents may *suggest* entries; the human writes them.

---

## 1. Goal and success criteria

Build a proof-of-concept product catalogue where customers can **browse, search and enquire**. It must be a **foundation, not a throwaway**: the product data source, the look and feel, and the email provider are all expected to change.

| Assessed area | What "great" means for this project |
|---|---|
| Solution design | Hard boundaries: web ↔ shared contract ↔ API ↔ services ↔ ports ↔ adapters. Each predicted change touches **one area** (§3.3), with the caveats stated honestly. |
| Decisions and assumptions | Every gap in the acceptance criteria is resolved explicitly, with alternatives and real-data evidence (§4). Every cut is justified (§2). |
| Implementation quality | Strict TypeScript, input validated at every trust boundary (including upstream responses), one error contract (RFC 9457), security basics (§10). |
| Testing | Every acceptance criterion has API **and** UI tests. API tests check responses against the shared schemas. Adapters pass one contract suite. Everything runs offline in under 30 seconds. |
| AI engineering practice | `AGENTS.md` with architecture rules **enforced by lint**, phase-gated execution with verify gates, an independent review of the plan, and honest logs of prompts and caught mistakes. |

**Hard constraints from the brief** (each one is traced to its solution in §18):

- **TC1:** one client and one backend from the allowed list; say which and why in the README.
- **TC2:** the client never calls Fake Store; all product data goes through our backend.
- **TC3:** any infrastructure must be AWS-compatible.
- **TC4:** a reviewer can run it locally in under 10 minutes, with one or two commands.
- **TC5:** no secrets committed; provide `.env.example`.
- **TC6:** no paid services or accounts needed.

---

## 2. Scope (MoSCoW)

| Tier | Items |
|---|---|
| **Must** (≈2h55m) | npm-workspaces monorepo · lint-enforced architecture rules · CI verify from P0 · **walking skeleton with Docker Compose + Mailpit in P1** · API: collections, categories, category products, search, product, image proxy, enquiry, health · zod at every boundary · RFC 9457 errors · Fake Store adapter (lazy, timeout, single-flight TTL cache, stale-on-error, upstream validation) · **fixture product source from a recorded snapshot (never cut)** · JSON merchandising config · SMTP email to Mailpit · enquiry: JSON-only, body limit, rate limit · Web: Home, Category, Search, Product + Enquiry, NotFound; loading, empty and error states; tokens; container/presentational split · tests for every AC (API + UI) · README, DECISIONS, AI_USAGE, AGENTS/CLAUDE.md · PR |
| **Should** (≈55m) | Repository contract test suite · API tests parse every response with the contract schemas · nginx security headers + CSP · request ID + PII-safe logging · graceful shutdown · CI compose smoke test (including the Mailpit check) · test that `.env.example` matches the env schema · **CI security checks (`npm audit`, gitleaks) + Dependabot, added in P0** · container hardening in compose · one-page `SECURITY.md` (§17.6) |
| **Could** | Playwright E2E · axe accessibility assertions · ETag / conditional GET · skeleton loaders · `pino-pretty` in dev |
| **Won't** (decided) | Auth/accounts · cart/checkout · **database or enquiry persistence (D13)** · ISMS paperwork (policies, risk register, Statement of Applicability: organisation-level, not a PoC deliverable; see §10.1) · admin UI for curation · pagination · i18n · SSR/SEO · IaC · CAPTCHA · **honeypot** (browser autofill can fill hidden fields and silently drop real leads; the rate limit covers abuse for the PoC) · **koa-helmet** (the API serves only JSON; nginx sets the headers that matter) · **console email transport** (dev uses Mailpit, so dev follows the same path as production) · customer confirmation email (§8.4) · image resizing · Redux/global state · DI container · GraphQL · OpenAPI generation · Storybook · Husky hooks (CI covers it) |

**Cut order if behind schedule:** Could items → CI compose smoke → repository contract suite → graceful shutdown → skeleton states (keep simple spinners).
**Never cut:** the acceptance criteria, the fixture source, critical-path tests, the walking skeleton, the docs deliverables, the PR.

---

## 3. Architecture

### 3.1 System context

```
Browser ──► web  (nginx-unprivileged :8080)   serves the static React build + security headers
              │   /api/*  reverse-proxied: same origin, so no CORS
              ▼
            api  (Koa :3000) ──► Fake Store API https://fakestoreapi.com      (PRODUCT_SOURCE=fakestore, default)
              │               └► recorded snapshot + placeholder images        (PRODUCT_SOURCE=fixture, offline)
              └──► SMTP :1025 ──► Mailpit (UI :8025) = the local "sales inbox"
```

### 3.2 Backend layers and the dependency rule

```
http (routes, middleware, presenters) ──► services ──► ports ◄── adapters
                 └─────────────┬──────────────┘                   │
                               ▼                                  ▼
                            domain ◄──────────────────────────────┘
composition-root.ts: the ONLY file that imports adapters, choosing and wiring them from env
```

| Layer | Contains | May import | Must never |
|---|---|---|---|
| `domain/` | Types, `AppError` subclasses, pure rules: `search.ts` (matching and ranking, D2), `slug.ts`, `money.ts` | domain only | do IO |
| `ports/` | The interfaces in §5.2 | domain | do IO |
| `services/` | `CatalogueService`, `EnquiryService`, pure `top-rated.ts` (D1) and `enquiry-email.ts` (§8.3) | domain, ports | import `koa`, `nodemailer`, adapters or http; call `fetch` |
| `adapters/` | Port implementations: the only place for `fetch`, SMTP and file IO | domain, ports | leak upstream types (Fake Store types stay in `adapters/products/fakestore/`) |
| `http/` | `createApp(deps)`, routes, validation, presenters (domain → DTO), error mapping | services, domain, `@catalogue/contracts` | import adapters; contain business rules |

These rules are **enforced by ESLint** (§15.3), not just documented.

### 3.3 Swap points: what changes, what doesn't, and the honest caveats

| Change | What changes | What doesn't | Caveat to state in DECISIONS |
|---|---|---|---|
| New product source (DB, Shopify, PIM) | add `adapters/products/<source>/` passing the repository contract suite; one line in the composition root | services, http, contracts, web | Curated IDs live in the old source's ID space, so migrating needs an ID map or SKU-based curation (unknown IDs are already skipped and logged). Load-all works only because there are 20 products; the query-shaped port lets a real source push queries down. |
| New email provider | add `adapters/email/<provider>-email-sender.ts`; config | enquiry flow and email content (composed in `services/`) | SES over SMTP needs only credentials (config). On ECS the better path is a ~20-line SES API adapter using the task's IAM role. |
| New look and feel | **Re-skin:** `tokens.css`. **Redesign:** `shared/ui/` and `features/*/components/` (presentational) | pages and containers, queries, API client, API | A new information architecture (new pages) also touches routes and containers. |
| Curation moves to a CMS | a new `MerchandisingSource` adapter | services | n/a |
| A mobile app joins | nothing in the API | versioned JSON API and contracts | per-client auth and limits would come later |
| Hosting on AWS | infrastructure only | code | The in-memory cache and rate limit are per instance (ElastiCache or WAF rules when scaled). Proxied image URLs give way to CDN URLs set in the presenter. |

### 3.4 Repository layout

The repo lives in its own folder, `product-catalogue-poc/`. The brief PDF is the employer's document and is **not** committed.

```
product-catalogue-poc/
├── .github/            workflows/ci.yml · dependabot.yml
├── apps/
│   ├── api/
│   │   ├── config/merchandising.json            # curated "top rated" IDs (Appendix B); bind-mounted in compose
│   │   ├── fixtures/fakestore-products.json     # RECORDED by `npm run snapshot`; never hand-edited
│   │   ├── assets/placeholder.svg               # image used in fixture mode
│   │   ├── scripts/snapshot-fakestore.ts        # records the fixture through the same upstream schema
│   │   ├── src/
│   │   │   ├── domain/     product.ts · enquiry.ts · errors.ts · search.ts · slug.ts · money.ts
│   │   │   ├── ports/      product-repository.ts · merchandising-source.ts · email-sender.ts · image-fetcher.ts · clock.ts
│   │   │   ├── services/   catalogue-service.ts · enquiry-service.ts · top-rated.ts · enquiry-email.ts
│   │   │   ├── adapters/
│   │   │   │   ├── products/   in-memory-product-repository.ts · cached-loader.ts
│   │   │   │   │   ├── fakestore/  fakestore-client.ts · fakestore-schema.ts · fakestore-mapper.ts
│   │   │   │   │   └── fixture/    fixture-loader.ts
│   │   │   │   ├── merchandising/  json-merchandising-source.ts
│   │   │   │   ├── email/          smtp-email-sender.ts
│   │   │   │   └── images/         http-image-fetcher.ts · placeholder-image-fetcher.ts
│   │   │   ├── http/
│   │   │   │   ├── app.ts          # createApp(deps): no env reads, no IO; tests use it directly
│   │   │   │   ├── routes/         health.ts · collections.ts · categories.ts · products.ts · enquiries.ts
│   │   │   │   ├── middleware/     error-handler.ts · request-context.ts · enquiry-rate-limit.ts · require-json.ts
│   │   │   │   ├── presenters.ts   # domain → DTO (sets imageUrl to our proxy route)
│   │   │   │   └── problem.ts      # RFC 9457 helpers
│   │   │   ├── config/env.ts       # zod-parsed env: the single source of defaults
│   │   │   ├── logger.ts           # pino, PII-safe
│   │   │   ├── composition-root.ts # env → adapters → services → app
│   │   │   └── server.ts           # listen + graceful shutdown
│   │   ├── test/                   # http integration tests, repository contract suite, fakes, builders
│   │   ├── Dockerfile · package.json · tsconfig.json · tsconfig.build.json · vitest.config.ts
│   └── web/
│       ├── public/placeholder.svg  # shown when a product image fails to load
│       ├── src/
│       │   ├── main.tsx
│       │   ├── app/        router.tsx · providers.tsx · Layout.tsx · NotFoundPage.tsx · RouteErrorPage.tsx
│       │   ├── features/
│       │   │   ├── catalogue/  api.ts · queries.ts
│       │   │   │               pages/       HomePage · CategoryPage · ProductPage                 ← containers
│       │   │   │               components/  ProductTile · ProductGrid · ProductDetails · CategoryNav  ← presentational
│       │   │   ├── search/     api.ts · queries.ts · pages/SearchPage · components/SearchForm
│       │   │   └── enquiry/    api.ts · mutations.ts · containers/EnquirySection · components/EnquiryForm · EnquiryThankYou
│       │   └── shared/
│       │       ├── api/        http.ts (the only fetch) · api-error.ts
│       │       ├── ui/         Button · TextField · TextArea · Spinner · ErrorState · EmptyState · VisuallyHidden
│       │       ├── lib/        format-price.ts · brand.ts
│       │       └── theme/      tokens.css · global.css
│       ├── test/           setup.ts · server.ts (MSW) · factories.ts · render.tsx
│       ├── index.html · vite.config.ts · nginx.conf · Dockerfile · package.json · tsconfig.json
├── packages/contracts/src/  product.ts · enquiry.ts · problem.ts · index.ts   # zod schemas + inferred types
├── scripts/smoke.sh                     # compose smoke test (CI and local)
├── docs/PLAN.md                         # this file
├── docker-compose.yml
├── package.json · package-lock.json · tsconfig.base.json · eslint.config.js · .prettierrc.json · .editorconfig · .nvmrc
├── .gitignore · .dockerignore · .env.example
├── AGENTS.md · CLAUDE.md                # agent instructions (Appendix A)
└── README.md · DECISIONS.md · AI_USAGE.md · SECURITY.md
```

---

## 4. Decisions (copy these into DECISIONS.md)

| # | Question | Decision | Why / alternatives |
|---|---|---|---|
| D1 | What does **"top rated"** mean? | **The owner's choice, everywhere.** `merchandising.json` holds an ordered list of product IDs (seeded with 5). **Home** shows all of them, in order. **Category page "Top rated"** shows the chosen products in that category, in configured order. **"More in {category}"** shows the rest of the category in source order, with no overlap. **Only fallback:** if a category has *no* chosen products, "Top rated" shows its top `categoryFallbackCount` (3) by customer rating (ties: rating count descending, then source order), logged at info. | The home AC defines the term: *"I have chosen 5 products to be 'top rated'"*. Using one meaning means a chosen product always appears as top rated in its own category, and the site never shows more top-rated products than the owner chose. The seed's 5 picks cover all 4 categories (electronics 2, other categories 1 each), so the fallback never fires with seed data; it exists so a new category never shows an empty section. Rejected: computing by rating everywhere (ignores "I have chosen"); filling every category up to 3 (inflates the owner's 5 picks to 12 "top rated" products). |
| D2 | What counts as **"text matching"** in search? | Server-side, on title, description and category name. Normalise both sides: lowercase, NFKD with accents stripped, apostrophes removed. Split on `/[^\p{L}\p{N}]+/u`. A query word longer than 3 letters ending in a single `s` (not `ss`) drops the `s`. **Every query word must be a prefix of some word.** Title matches rank first, then the rest; each group keeps source order. A query with no searchable words returns `[]`. **Never build a `RegExp` from user input.** | ✅ Real data: plain substring search for "men" returns 13 products, **including all women's clothing**; word-prefix returns exactly the 4 men's products. Prefix-only search misses plurals: "jackets" finds 2 of 4 jackets and "rings" finds nothing. With the plural rule both are right, and "dress" is unaffected. Done on the server because Fake Store has no search endpoint; the port lets a real source search natively. |
| D3 | Enquiry fields and outcome | Name and email required; phone and message optional; product referenced by ID. The schema is **strict**: unknown keys such as `title` or `price` are rejected, and product details always come from our repository. The API returns `202 Accepted` **only after the mail relay accepts the message**. Otherwise it returns 502 and the customer sees an error, not "Thank you". | "202" means accepted and handed to the relay, not "delivered to the inbox" (SMTP can't promise that). It also keeps the contract stable for a later queue or outbox. Not persisted in the PoC: the email is the record. |
| D4 | Product images | Proxied: `GET /api/v1/products/:id/image`. In fixture mode the API serves a bundled placeholder, so offline really is offline. | TC2 says *all product data* goes through our backend. Proxying also lets the browser enforce TC2: CSP `img-src 'self'` and `connect-src 'self'` make any accidental call to Fake Store fail visibly. |
| D5 | Prices and currency | Treated as **AUD**. Stored as integer cents (`Math.round(price * 100)`) and formatted with `Intl.NumberFormat('en-AU')`. | The data has no currency; the business is Australian. Integer minor units avoid floating-point bugs (`0.29 * 100 = 28.999…`). ✅ 109.95 → 10995. |
| D6 | Product IDs | **Opaque strings** everywhere outside the Fake Store adapter. Routes validate `^[A-Za-z0-9_-]{1,64}$`; never use `z.coerce.number()`. | Future sources (Shopify GIDs, UUIDs) aren't numeric. |
| D7 | Category URLs and order | Slug made from the name: normalised as in D2, words joined with `-` (e.g. "men's clothing" → `mens-clothing`). Display names in title case. Upstream spellings are kept (e.g. "Jewelery"). Categories are sorted by name. | Clean, stable URLs; no silent rewriting of source data. |
| D8 | Chosen IDs that no longer exist | Skipped with a warning log, not a crash. | The data source and the merchandising config change independently. |
| D9 | Data loading strategy | The Fake Store adapter **lazily** loads all products (20 ✅) with one `GET /products`, caches them, and answers every port query in memory. It never calls `/products/:id`. | Fewer upstream calls; boot never blocks on Fake Store; avoids the upstream quirk in §7. Trade-off: doesn't scale to big catalogues, and doesn't need to here. |
| D10 | API shape | Versioned (`/api/v1`). Lists use an envelope (`{ items }`). Errors use RFC 9457 `application/problem+json`. | Envelopes let pagination arrive without breaking clients. Versioning protects future mobile clients. Problem Details is the standard error format. |
| D11 | Spam protection | Rate limit per client IP; **no honeypot**. | Browser autofill can fill hidden honeypot fields, which would silently drop real leads. CAPTCHA (e.g. Turnstile) is a next-day item. |
| D12 | Email in development | No console transport: `npm run dev` starts Mailpit and uses the same SMTP adapter as production. | One code path, and the sales-inbox AC can be checked in dev. |
| D13 | Database | **None in the PoC.** Products are owned by the upstream source and cached in memory; the top-rated picks are a versioned JSON file; enquiries aren't stored, and the email in the sales inbox is the record (§10.2). | No acceptance criterion needs persistence. A database would add a service, migrations and seed data to the reviewer's 10-minute run, and storing enquiries would mean holding PII, with retention, access-control and breach obligations, for no PoC benefit. **When it's needed:** PostgreSQL (Amazon RDS or Aurora) behind the existing ports. That means a `PostgresProductRepository` that passes the contract suite, plus an `enquiries` table with a transactional outbox so a lead survives an email outage (202 then becomes truly asynchronous). Shared rate limits and cache go in Redis (ElastiCache), not the database. |

---

## 5. Domain model, ports and services (API-internal)

### 5.1 Domain types

```ts
type ProductId = string;                                         // opaque
interface Money    { amountCents: number; currency: string }     // ISO 4217
interface Category { slug: string; name: string }
interface Rating   { average: number; count: number }
interface Product {
  id: ProductId; title: string; description: string; price: Money; category: Category;
  imageSourceUrl: string;            // upstream URL: internal only, never sent to clients
  rating: Rating | null;             // other sources may not have ratings
}
interface Enquiry {
  id: string; receivedAt: Date; product: Product;
  customer: { name: string; email: string; phone?: string; message?: string };
}
```

**Errors** (`domain/errors.ts`): `AppError` (base, with `code` and `status`), `NotFoundError` (404), `ValidationError` (400, field errors), `UnsupportedMediaTypeError` (415), `ProductNotFoundError` (422), `RateLimitedError` (429), `UpstreamUnavailableError` (502), `EmailDeliveryError` (502).

### 5.2 Ports: the only interfaces in the codebase

```ts
interface ProductRepository {
  listCategories(): Promise<Category[]>;                      // sorted by name
  listByCategory(slug: string): Promise<Product[] | null>;    // null = unknown category → 404
  getById(id: ProductId): Promise<Product | null>;            // null = not found; never throws for not-found
  getByIds(ids: readonly ProductId[]): Promise<Product[]>;    // keeps input order, skips unknown IDs
  search(query: string): Promise<Product[]>;                  // D2; a native engine may implement it itself
}
// Availability failures (timeout, non-2xx, invalid payload) throw UpstreamUnavailableError.

interface MerchandisingConfig { topRatedProductIds: ProductId[]; categoryFallbackCount: number }
interface MerchandisingSource { getConfig(): Promise<MerchandisingConfig> }

interface EmailMessage { from: string; to: string; replyTo?: string; subject: string; text: string }
interface EmailSender  { send(message: EmailMessage): Promise<void> }     // transport only; throws on failure

interface ImageFetcher { fetch(sourceUrl: string): Promise<{ contentType: string; body: Uint8Array }> }

type Clock = () => Date;
```

The **in-memory repository** (used by both the Fake Store and fixture sources) implements `search` with `domain/search.ts`.

### 5.3 Services (concrete classes, constructor-injected)

- **`CatalogueService`:** `getTopRated()`, `listCategories()`, `getCategoryPage(slug)`, `search(q)`, `getProduct(id)`, `getProductImage(id)`. `getCategoryPage` uses the pure `selectCategoryTopRated(products, chosenIds, fallbackCount)`, which returns `{ topRated, others, mode: 'chosen' | 'fallback' }`.
- **`EnquiryService`:** `submit(input)`, following §8.2. It composes the email with the pure `composeEnquiryEmail` and hands it to `EmailSender`.

---

## 6. API contract v1

`packages/contracts` exports **zod schemas** (`productDtoSchema`, `categoryProductsResponseSchema`, `enquiryRequestSchema`, `problemDetailsSchema`, …) and the types inferred from them. The API presenters, the API tests (which `parse` every response) and the web client all use them. **To change the contract, edit `contracts` first, then the API, then the web app.**

```ts
type MoneyDto    = { amountCents: number; currency: string };
type CategoryDto = { slug: string; name: string };
type RatingDto   = { average: number; count: number };
type ProductDto  = { id: string; title: string; description: string; price: MoneyDto; category: CategoryDto;
                     imageUrl: string;      // "/api/v1/products/3/image": render verbatim, never build URLs
                     rating: RatingDto | null };
type ListResponse<T>          = { items: T[] };
type CategoryProductsResponse = { category: CategoryDto; topRated: ProductDto[]; others: ProductDto[] };
type EnquiryRequest           = { productId: string; name: string; email: string; phone?: string; message?: string };
type EnquiryAcceptedResponse  = { enquiryId: string };
type ProblemDetails = { type: string; title: string; status: number; detail?: string; code: ErrorCode;
                        requestId?: string; errors?: { path: string; message: string }[] };
type ErrorCode = 'VALIDATION_FAILED' | 'NOT_FOUND' | 'PRODUCT_NOT_FOUND' | 'UNSUPPORTED_MEDIA_TYPE'
               | 'PAYLOAD_TOO_LARGE' | 'RATE_LIMITED' | 'UPSTREAM_UNAVAILABLE' | 'EMAIL_DELIVERY_FAILED'
               | 'INTERNAL_ERROR';
```

| Method and path | Success | Errors | `Cache-Control` |
|---|---|---|---|
| `GET /api/health` | 200 `{ "status": "ok" }` (liveness only, no upstream calls) | n/a | `no-store` |
| `GET /api/v1/collections/top-rated` | 200 `ListResponse<ProductDto>` | 502 | `public, max-age=60` |
| `GET /api/v1/categories` | 200 `ListResponse<CategoryDto>` | 502 | `public, max-age=60` |
| `GET /api/v1/categories/:slug/products` | 200 `CategoryProductsResponse` | 404, 502 | `public, max-age=60` |
| `GET /api/v1/products?q=` | 200 `ListResponse<ProductDto>` | 400 if `q` is missing, empty after trimming, or over 100 characters; 502 | `public, max-age=60` |
| `GET /api/v1/products/:id` | 200 `ProductDto` | 404, 502 | `public, max-age=60` |
| `GET /api/v1/products/:id/image` | 200 image bytes (`image/*`) | 404, 502 | `public, max-age=86400` |
| `POST /api/v1/enquiries` | **202** `EnquiryAcceptedResponse` | 400, 413, 415, 422 `PRODUCT_NOT_FOUND`, 429 + `Retry-After`, 502 `EMAIL_DELIVERY_FAILED` | `no-store` |
| any other `/api/*` | n/a | 404 `NOT_FOUND` as problem+json | n/a |

**Rules:**
- Malformed `:id` or `:slug` (`^[a-z0-9-]{1,64}$`) is a 404.
- `collections/:slug` is the extension point for future curated lists; only `top-rated` exists now.
- Every response carries `X-Request-Id` and `X-Content-Type-Options: nosniff`; problem bodies include `requestId`.
- Never serialise domain objects directly: always go through the presenters.

---

## 7. Fake Store integration: verified facts ✅ and adapter behaviour

| Fact (probed 2026-11-20) | Consequence |
|---|---|
| `GET /products` returns 20 products; about 1s latency | Load all lazily, cache them (D9) |
| Categories: `electronics`, `jewelery`, `men's clothing`, `women's clothing` | Slugs and names per D7 |
| **Unknown or non-numeric ID (`/products/999`, `/products/abc`) returns `200` with an empty body**, not 404 | Never call per-ID. Anyone who does must treat an empty body as not found; calling `res.json()` blindly throws and turns a 404 into a 502. |
| Images on `fakestoreapi.com/img/…`, PNG of about 270 KB. `GET` returns 200 with `cache-control: max-age=14400`; **`HEAD` returns 403** | The image fetcher uses `GET` only. Allowlist host `fakestoreapi.com`. |
| Shape `{ id:number, title, price:number, description, category, image, rating:{ rate, count } }` | Validated with zod at the adapter boundary |

**Fake Store client and cached loader:**
- **Lazy:** nothing is fetched at boot, so the API starts even when Fake Store is down.
- `fetch` with `AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)`, plus **one retry** on a network error or 5xx. Anything still failing becomes `UpstreamUnavailableError`.
- **Validate the payload with zod.** Invalid items are skipped with a warning; if the payload isn't an array, it's an upstream error.
- **TTL cache:**
  - single-flight (cache the in-flight *promise*)
  - never cache failures
  - stale-on-error: serve the last good data and log `catalogue.stale_served`
- Mapper (pure, unit tested): `id` → `String(id)`, `price` → cents, category → `{ slug, name }`, `image` → `imageSourceUrl`, `rating.rate` → `average`.

**Fixture source (`PRODUCT_SOURCE=fixture`):**
- Loads `apps/api/fixtures/fakestore-products.json` through the **same schema and mapper**.
- The file is **recorded**, not written by hand: `npm run snapshot -w @catalogue/api` fetches `/products`, validates it and writes it. Never hand-write product data.
- Images come from `PlaceholderImageFetcher` (bundled SVG), so the whole app runs offline.
- Uses: offline dev, deterministic CI smoke tests, a fallback if Fake Store is down during review, and **proof that the source is swappable**: two real sources behind one port, switched by config.

**HTTP image fetcher (Fake Store mode):**
- Takes URLs only from our repository; the route accepts a product ID, never a URL, so there's no SSRF.
- Checks the host against `IMAGE_ALLOWED_HOSTS`.
- `GET` with a timeout; requires `image/*`; caps size at 5 MB; keeps a bounded in-memory cache of 50 entries.

The API logs the **active product source** at startup.

---

## 8. Enquiry and email

### 8.1 Fields (strict, shared zod schema in `contracts`, used by the form and by the API)

| Field | Required | Rules | Label |
|---|---|---|---|
| `productId` | yes | opaque ID, `^[A-Za-z0-9_-]{1,64}$` | none (taken from the page) |
| `name` | yes | trimmed, 1–100 characters | Full name |
| `email` | yes | trimmed, valid email, at most 254 characters | Email |
| `phone` | no | trimmed, at most 30 characters, `^[0-9+()\- ]*$`; an empty string is treated as absent | Phone (optional) |
| `message` | no | trimmed, at most 2000 characters | Message (optional) |
| *anything else* | n/a | **rejected (400)**: the schema is `.strict()` | n/a |

### 8.2 Flow (`EnquiryService.submit`)
1. `productRepository.getById`; if the product doesn't exist, throw `ProductNotFoundError` (422).
2. Build the `Enquiry` (`crypto.randomUUID()`, `clock()`).
3. `emailSender.send(composeEnquiryEmail(enquiry, { to, from, webBaseUrl }))`. On failure, throw `EmailDeliveryError` (502) and log `enquiry.failed { enquiryId, productId }`.
4. Log `enquiry.accepted { enquiryId, productId }` (no PII) and return `{ enquiryId }`.

### 8.3 Email (`services/enquiry-email.ts`, pure; provider-neutral `EmailMessage`)

```
To:        ${SALES_INBOX_EMAIL}
From:      ${ENQUIRY_FROM_EMAIL}                    ← never from user input
Reply-To:  "<customer name>" <customer email>       ← sales replies straight to the customer
Subject:   New enquiry: <product title> [ref <first 8 characters of enquiryId>]   (CR/LF stripped, ≤150 characters)
Body (text/plain only, so nothing can be injected):
  New product enquiry
  Reference: <enquiryId>            Received: <ISO-8601 UTC>
  Product:   <title> (ID <id>)      Price: <A$x.xx>
  Link:      ${PUBLIC_WEB_URL}/products/<id>
  Name: …   Email: …   Phone: … | not provided
  Message:
  … | not provided
```

`SmtpEmailSender` uses nodemailer with explicit `connectionTimeout`, `greetingTimeout` and `socketTimeout` of 10s.

### 8.4 Assumption: no confirmation email to the customer
Sending mail to any address someone types in would turn the form into a spam relay. The on-screen thank-you is the confirmation for the PoC.

---

## 9. Frontend spec

### 9.1 Structure rules (what makes a redesign cheap)
- **Containers** (`features/*/pages/`, `features/*/containers/`, `app/Layout.tsx`) own data and behaviour: queries, mutations, routing and state.
- **Presentational components** (`features/*/components/`, `shared/ui/`) are props in, JSX out. They may use `Link`/`NavLink` and local UI state, including react-hook-form, but **never** the data layer: no `@tanstack/react-query`, no `api.ts`/`queries.ts`/`mutations.ts`, no `shared/api`. This is lint-enforced (§15.3).
- `shared/api/http.ts` is the **only** `fetch` caller. The literal `fakestoreapi` must never appear in `apps/web` (also lint-enforced).
- Router: React Router **data mode** (`createBrowserRouter` + `RouterProvider`, no loaders or actions; TanStack Query owns data), with a route-level `errorElement` (`RouteErrorPage`). **Not** framework mode.

### 9.2 Routes and pages

| Route | Container | Shows | API |
|---|---|---|---|
| `/` | HomePage | `h1` placeholder tagline; **"Top rated"** grid in configured order | `collections/top-rated` |
| `/category/:slug` | CategoryPage | `h1` category name; **"Top rated"** grid; **"More in {name}"** grid (omitted if empty); API 404 → NotFound | `categories/:slug/products` |
| `/search?q=` | SearchPage | `h1` `Results for "{q}"`; grid; empty state `No products match "{q}"`; if `q` is missing, a prompt to search | `products?q=` |
| `/products/:id` | ProductPage | ProductDetails (image, title, price, "4.7 out of 5 (500 reviews)", category link, description) + EnquirySection; API 404 → NotFound | `products/:id` |
| `*` | NotFoundPage | message and a link home | n/a |

- **Layout** (container): a skip link; a `header` with the brand link, `CategoryNav` (`nav aria-label="Categories"`, NavLinks with an active state, data from `categories`) and `SearchForm`; then `main` and `footer`. Each page sets its own `<title>` (React 19 hoists it into `<head>`).
- **SearchForm** (presentational, takes `initialQuery` and `onSearch`): `<form role="search">` with a labelled `input type="search" name="q" required maxLength=100` and a visible **Search** button. The value is trimmed and empty submits are ignored. Layout's `onSearch` navigates to `/search?q=…`. The URL is the state, so results are shareable and the back button works.
- **ProductTile** (presentational): an `<article>` whose single `<Link>` wraps the image and title, so the link is named by the title. No nested controls. The image has `src={imageUrl}` (verbatim), `loading="lazy"`, explicit `width`/`height`, `alt={title}`, and **`onError` → `/placeholder.svg`**.

### 9.3 Enquiry interaction (EnquirySection = container; EnquiryForm and EnquiryThankYou = presentational)
1. **"Enquire about this product"** button (`aria-expanded`, `aria-controls`). Clicking it reveals the form inline and moves focus to Full name.
2. EnquiryForm uses react-hook-form with `zodResolver` and the **shared** schema (without `productId`). Errors appear inline with `aria-invalid`/`aria-describedby`; focus moves to the first invalid field.
3. While submitting, the button is disabled and reads "Sending…", so the form can't be submitted twice.
4. **On 202**, EnquiryThankYou replaces the form with `role="status"` text, which takes focus: *"Thank you, {name}! We've received your enquiry about {title}. Our sales team will contact you at {email}."*
5. **On error:**
   - 400: server field errors are mapped onto the fields.
   - 422: "This product is no longer available".
   - 429: "Too many enquiries, please try again in {n} minutes" (from `Retry-After`).
   - 5xx or network failure: `role="alert"` with "We couldn't send your enquiry. Please try again."

   **Form values are kept.**
6. A privacy note under the form reads: *"We'll only use these details to respond to your enquiry."*

### 9.4 Data layer
- `http.ts` uses base path `/api/v1` and parses problem+json into `ApiError { status, code, title, fieldErrors, requestId }`. A network failure becomes `ApiError(status 0, 'NETWORK_ERROR')`.
- QueryClient defaults: `staleTime: 60_000`, `refetchOnWindowFocus: false`, `retry: (n, e) => e instanceof ApiError && (e.status === 0 || e.status >= 500) && n < 2`. The default of 3 retries with backoff would take about 7s to show "not found".
- The web build needs **no env vars**: it uses a relative `/api`, so one build runs in every environment.

### 9.5 Look and feel and accessibility
- `tokens.css` defines CSS custom properties: colours, font stacks, `--space-1…8`, radii and shadows. `global.css` holds a reset and the `:focus-visible` outline. CSS Modules reference **tokens only**; no hard-coded colours or fonts.
- Responsive and mobile-first; checked at 375px. Grid: `repeat(auto-fill, minmax(12rem, 1fr))`.
- Accessibility: landmarks, one `h1` per page, labelled controls, visible focus, keyboard-only usable, `aria-live` regions, AA contrast in the token choices. `eslint-plugin-jsx-a11y` is on.
- Brand: a neutral placeholder ("Catalogue") in `shared/lib/brand.ts`. **Do not use any real company's name or branding.**

---

## 10. Security, privacy and data

### 10.1 What the brief requires, and what it doesn't
- **Required:**
  - TC5: no secrets committed, with `.env.example` for configuration.
  - TC2: all product data goes through our backend.
  - The scored criterion: *"sensible error handling, validation and security basics"*.
- **Not required:** an ISMS, ISO/IEC 27001 certification, SOC 2 or PCI DSS. There are no payments, so PCI DSS doesn't apply.
- An ISMS is an organisation-wide management system (policies, risk register, Statement of Applicability, audits). A single PoC repository can't "comply" with one, and producing that paperwork here would be over-engineering. Instead the PoC follows the secure-development practices an ISMS expects (§10.6) and uses **OWASP ASVS Level 1** as the yardstick for "security basics".
- **The area that matters most is privacy:** the enquiry form collects personal information (§10.5).

### 10.2 Data inventory and classification (there is no database: D13)

| Data | Source of truth | Where it lives at runtime | Stored? | Classification |
|---|---|---|---|---|
| Products, categories, images | Fake Store (or the recorded fixture) | API memory cache (5-minute TTL; up to 50 images) | No: the upstream owns it | Public |
| Top-rated picks | `merchandising.json` in git | read at boot | In git | Internal |
| **Enquiries** (name, email, phone, message) | the customer | request memory only, then the email | **Only as the email in the sales inbox** (locally Mailpit: test data, discarded with the container) | **Confidential (PII)** |
| Rate-limit counters | n/a | API memory | No: reset on restart | Internal |
| Application logs | n/a | stdout (CloudWatch in AWS) | Platform retention; **no PII** | Internal |
| Secrets | none in the PoC | production: AWS Secrets Manager, or none with an IAM role | Never in git | Secret |

### 10.3 Threat model (lightweight STRIDE)
Trust boundaries: browser → nginx (public internet) · nginx → API · API → Fake Store (untrusted upstream) · API → SMTP relay.

| Threat | Example | Mitigation |
|---|---|---|
| Spoofing | Dodging the rate limit with a forged `X-Forwarded-For` | `app.maxIpsCount = 1`; the proxy is trusted only behind nginx |
| Spoofing | An enquiry claiming a different product title or price | strict schema; product looked up server-side |
| Tampering | Email header injection through the name or subject | CR/LF stripped; From fixed; plain text only |
| Tampering | A changed or compromised upstream payload (e.g. markup in a description) | zod validation; React renders text, never HTML; strict CSP |
| Repudiation | Can't trace what happened to an enquiry | `enquiryId` in the email subject and the logs, plus the request ID |
| Information disclosure | PII in logs; stack traces in responses | no bodies in logs, targeted redaction; problem+json without internals |
| Information disclosure | SSRF through the image proxy | product ID in, never a URL; host allowlist; `GET` only; size cap |
| Denial of service | Email-bombing the sales inbox; huge bodies; slow upstream | rate limit; 10 KB body limit; timeouts; cache + stale-on-error |
| Denial of service | ReDoS through search | no `RegExp` from input; 100-character cap |
| Elevation of privilege | Container escape after an app compromise | non-root; read-only root filesystem; all capabilities dropped; `no-new-privileges` |

### 10.4 Controls checklist

- **Validate at every trust boundary** with zod: route params, query, body (strict), env, merchandising file, **and upstream responses**.
- **Secrets:** none needed. `.env` is git-ignored and docker-ignored. `.env.example` holds placeholders only, using `example.com` addresses (RFC 2606).
- **Request hardening:** `POST` requires `Content-Type: application/json`, otherwise **415**. This blocks cross-site HTML form posts, including the `text/plain` JSON-CSRF trick. `@koa/bodyparser` runs with `enableTypes: ['json']` and `jsonLimit: '10kb'`; anything larger returns 413.
- **Rate limit:**
  - **5 enquiries per 10 minutes per IP**; the 6th returns 429 with `Retry-After`.
  - `app.proxy = TRUST_PROXY` and `app.maxIpsCount = 1`, so `ctx.ip` is the address nginx appended and can't be spoofed through `X-Forwarded-For`.
  - The memory store is per instance (DECISIONS: ElastiCache or a WAF rate rule when scaled).
- **No CORS:** same origin through the Vite proxy (dev), nginx (Docker) and CloudFront `/api/*` (AWS).
- **Browser headers** come from nginx: `Content-Security-Policy: default-src 'self'; img-src 'self' data:; script-src 'self'; style-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`, plus `X-Content-Type-Options: nosniff` and `Referrer-Policy: strict-origin-when-cross-origin`. With images proxied, **the CSP makes the browser enforce TC2**.
- **Email:** plain text only; CR/LF stripped from the subject; From is fixed; product details come from the server only.
- **Image proxy:** product ID in, never a URL; host allowlist; `image/*` only; size cap.
- **Errors:** never send stack traces or internal messages. Unknown errors become 500 `INTERNAL_ERROR` and are logged with the request ID.
- **PII:**
  - Never pass request bodies, `customer` objects or the `EmailMessage` to the logger.
  - pino `redact` covers `req.headers.authorization`, `req.headers.cookie`, `*.customer`, `*.email` and `*.phone`.
  - **Do not** redact `*.message` or `*.name`: that would blank error messages and category names.
- **Containers:** run as non-root (`USER node`, nginx-unprivileged); base images pinned to a major tag; `npm ci` from the committed lockfile.
- **Rendering:** React escapes all text. `dangerouslySetInnerHTML`, `eval` and `new Function` are lint-banned (§15.3). A UI test feeds a product description containing HTML and asserts it renders as plain text.
- **Container hardening (compose; verified in the P1 skeleton):** `api` and `web` run with `read_only: true`, `tmpfs: [/tmp]`, `cap_drop: [ALL]` and `security_opt: ["no-new-privileges:true"]`. ✅ nginx-unprivileged already points its pid and temp paths at `/tmp`, so this works as long as we replace only `conf.d/default.conf` and keep the image's main `nginx.conf`.
- **Production transport and secrets (documented, not built):**
  - TLS terminates at CloudFront or the ALB, using ACM certificates.
  - HSTS is set by a CloudFront response-headers policy, never on localhost.
  - SMTP to a real provider uses TLS.
  - SMTP credentials live in AWS Secrets Manager, or there are none at all when the SES API adapter uses the task's IAM role.

### 10.5 Privacy (enquiry PII)
Enquiries are personal information under Australia's *Privacy Act 1988*. Whether or not the business is covered today (small businesses can be exempt), following the Australian Privacy Principles costs almost nothing and suits a foundation that will grow. These are engineering considerations, not legal advice.

| Principle | What the PoC does |
|---|---|
| APP 1: open and transparent management | Assumption: the owner publishes a privacy policy before launch; linking it from the footer is a next-day item |
| APP 3: collect only what's needed | name and email required; phone and message optional; nothing else |
| APP 5: notification of collection | collection notice under the form (§9.3) |
| APP 6 and APP 7: use, disclosure, direct marketing | used only to answer the enquiry; never added to marketing lists without consent |
| APP 8: cross-border disclosure | production email provider and hosting in an Australian region (e.g. SES in `ap-southeast-2`) |
| APP 11: security of personal information | not stored by the app; no PII in logs; TLS in production; access to the sales inbox is the business's responsibility |

- **Notifiable Data Breaches scheme:** not storing enquiries keeps the breach surface minimal.
- **Spam Act 2003:** nothing is sent to customers (§8.4), so no consent or unsubscribe obligations arise.
- **IP addresses:** nginx access logs contain client IPs, which can be personal information. Set a retention period in production.

### 10.6 ISMS alignment (for discussion, not compliance)
If the business runs an ISO/IEC 27001 ISMS, this is how the PoC's engineering practices line up with the 2022 Annex A controls. Use it to answer the question in interview, not as paperwork in the repo.

| Annex A control | How the PoC shows it |
|---|---|
| 5.12 Classification of information | data inventory (§10.2) |
| 5.19 / 5.21 Supplier and ICT supply-chain security | Fake Store treated as untrusted (validation, timeouts, fixture fallback); lockfile, pinned images, Dependabot |
| 5.34 Privacy and protection of PII | §10.5: minimisation, collection notice, no storage, no PII in logs |
| 8.4 Access to source code | private repository; reviewers added as collaborators |
| 8.8 Management of technical vulnerabilities | `npm audit` in CI; Dependabot updates |
| 8.9 Configuration management | 12-factor config validated at boot; no secrets in git |
| 8.15 Logging · 8.16 Monitoring activities | structured JSON logs, request IDs, business and security events |
| 8.25 Secure development life cycle | phase gates, review gates, CI on every commit, PR review |
| 8.26 Application security requirements · 8.27 Secure architecture | §10.1–10.4; layered architecture with lint-enforced boundaries; least privilege; defence in depth |
| 8.28 Secure coding | validation at every boundary; no `RegExp` from input; plain-text email; lint bans |
| 8.29 Security testing in development and acceptance | security test cases (§13) and CI security checks (§10.7) |
| 8.31 Separation of environments · 8.32 Change management | env-driven config; Mailpit and fixture mode only outside production; PRs, Conventional Commits, tagged submission |

### 10.7 Automated security checks (CI `security` job, added in P0)
- `npm audit --omit=dev --audit-level=high`: fails on high or critical issues in runtime dependencies.
- **Secret scan of the full git history** with gitleaks pinned to `v8.30.1` ✅. No account or licence is needed. Check out with `fetch-depth: 0` and use `--redact`. Confirm the subcommand with `--help` for the pinned version. If the Docker image trips git's "dubious ownership" check on the mounted repo, use the release binary instead.
- `.github/dependabot.yml`: weekly updates for npm, GitHub Actions and Docker base images.
- Workflow hardening: top-level `permissions: contents: read`; GitHub-owned actions by major tag; any third-party action pinned to a full commit SHA.
- Could: Trivy image scan; CodeQL (free only for public repositories).

---

## 11. Configuration (12-factor)

**`config/env.ts` (zod) is the single source of defaults.** Empty strings count as unset. Compose sets only container-specific values and passes everything else through, so `.env` overrides work and defaults never drift.

| Variable | Default (zod) | Validation | Purpose |
|---|---|---|---|
| `PORT` / `HOST` | `3000` / `0.0.0.0` | int / string | API bind |
| `NODE_ENV` | `development` (compose: `production`) | `development \| test \| production` | |
| `LOG_LEVEL` | `info` | pino level | |
| `TRUST_PROXY` | `false` (compose: `true`) | **`'true' \| 'false'` enum** | trust nginx's `X-Forwarded-For` |
| `PRODUCT_SOURCE` | `fakestore` | `fakestore \| fixture` | data source adapter |
| `FAKESTORE_BASE_URL` | `https://fakestoreapi.com` | URL | |
| `UPSTREAM_TIMEOUT_MS` | `5000` | int 100–30000 | |
| `CATALOGUE_CACHE_TTL_SECONDS` | `300` | int ≥ 0 | |
| `CATALOGUE_CURRENCY` | `AUD` | 3 uppercase letters | |
| `IMAGE_ALLOWED_HOSTS` | `fakestoreapi.com` | comma-separated list | |
| `MERCHANDISING_FILE` | `config/merchandising.json` | path, relative to the api package dir (the process cwd in dev, tests and Docker) | |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` | `localhost` (compose: `mailpit`) / `1025` / `false` | string / int / enum | |
| `SMTP_USER` / `SMTP_PASS` | unset | optional | real providers only; never commit them |
| `SALES_INBOX_EMAIL` | `sales@example.com` | email | the "sales inbox" |
| `ENQUIRY_FROM_EMAIL` | `enquiries@example.com` | email | |
| `PUBLIC_WEB_URL` | `http://localhost:5173` (compose: `http://localhost:${WEB_PORT:-8080}`) | URL | links in emails |
| `ENQUIRY_RATE_LIMIT_MAX` / `_WINDOW_SECONDS` | `5` / `600` | int | |
| Compose only: `WEB_PORT`, `API_PORT`, `MAILPIT_UI_PORT` | `8080`, `3000`, `8025` | n/a | change these if a port is busy |

⚠️ **Never use `z.coerce.boolean()`**: it turns the string `"false"` into `true`.

A unit test checks that the keys in `.env.example` match the schema.

---

## 12. Local run and containers

### 12.1 Reviewer experience (TC4)

```bash
docker compose up --build        # the only command; no .env needed
```
- Web: http://localhost:8080 · Mailpit (sales inbox): http://localhost:8025 · API: http://localhost:3000/api/health
- Offline, or if Fake Store is down: `PRODUCT_SOURCE=fixture docker compose up --build`.

### 12.2 docker-compose.yml requirements
- `name: catalogue` at the top. No obsolete `version:` key, no `platform:` pins (reviewers may be on Apple Silicon), and no `env_file:` (it fails on a fresh clone with older Compose versions).
- **`api`:**
  - build `{ context: ., dockerfile: apps/api/Dockerfile }` and `init: true`
  - `environment:`
    - container values: `NODE_ENV: production`, `TRUST_PROXY: "true"`, `SMTP_HOST: mailpit`, `PUBLIC_WEB_URL: http://localhost:${WEB_PORT:-8080}`
    - pass-throughs for every other variable, e.g. `PRODUCT_SOURCE: ${PRODUCT_SOURCE:-}`
  - volume `./apps/api/config:/app/apps/api/config:ro`, so changing the top-rated picks needs only `docker compose restart api`
  - healthcheck that needs no curl or wget:
    ```yaml
    test: ["CMD", "node", "-e", "fetch('http://127.0.0.1:3000/api/health').then(r => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
    interval: 5s
    timeout: 3s
    retries: 10
    start_period: 5s
    ```
  - `depends_on: [mailpit]`
- **`web`:** build `{ context: ., dockerfile: apps/web/Dockerfile }`; ports `${WEB_PORT:-8080}:8080`; `depends_on: { api: { condition: service_healthy } }`. nginx fails to start if the `api` hostname doesn't resolve.
- **`mailpit`:** `axllent/mailpit:v1.34`; publish the UI on `${MAILPIT_UI_PORT:-8025}:8025`. SMTP 1025 stays on the internal network.

### 12.3 Dockerfile requirements (the workspace build is the main risk to TC4, which is why it's built in P1)
- **Build context is the repo root** for both images.
- Copy the root `package.json` and `package-lock.json` plus **every** workspace's `package.json` first, run `npm ci`, then copy the sources.
- Build `@catalogue/contracts` first, then the app.
- **API:**
  - multi-stage on `node:24-alpine`; `npm prune --omit=dev` before the runtime stage
  - the runtime stage keeps the workspace symlink target (`packages/contracts/{package.json,dist}`), plus `apps/api/{dist,config,fixtures,assets,package.json}`
  - `ENV NODE_ENV=production`, `USER node`, `WORKDIR /app/apps/api`, `EXPOSE 3000`, `CMD ["node","dist/server.js"]`
- **Web:** a `node:24-alpine` build stage runs `vite build`. The runtime is `nginxinc/nginx-unprivileged:stable-alpine` (non-root, port 8080) with `nginx.conf`:
  - `location /api/ { proxy_pass http://api:3000; … }`. **No trailing slash** on `proxy_pass`, so the `/api` prefix is kept. Set `X-Forwarded-For $proxy_add_x_forwarded_for` and `X-Request-Id $request_id`.
  - `location / { try_files $uri /index.html; }`, so deep links survive a refresh.
  - `/assets/` cached for a year as `immutable`; `index.html` served with `no-cache`; gzip on; the §10 headers with `always`.
- `.dockerignore`: `**/node_modules`, `**/dist`, `**/coverage`, `**/.env*` (except `.env.example`), `.git`, `*.pdf`. The `**/` prefix matters: without it, workspace `node_modules` with host-native binaries get into the Linux image.
- The Node major is pinned once in `.nvmrc` and reused in `engines`, the Dockerfiles and CI (`node-version-file: .nvmrc`).

### 12.4 AWS path (documented in DECISIONS.md, not built)
- Web on S3 + CloudFront, with a `/api/*` behaviour pointing at the API origin.
- API container on ECS Fargate or App Runner behind an ALB, with `/api/health` as the health check.
- Email through an SES API adapter using the task's IAM role (or SES SMTP credentials as config only).
- Merchandising config in SSM Parameter Store, then a CMS.
- Logs to CloudWatch via stdout.
- ElastiCache and/or WAF rate rules when running more than one instance.

### 12.5 Developer mode
`npm ci && npm run dev`. This starts Mailpit (`docker compose up -d mailpit`), builds contracts, then runs the API (`tsx watch`, :3000) and Vite (:5173, proxying `/api`) together via `concurrently`.

---

## 13. Testing strategy

| Layer | Tooling | What |
|---|---|---|
| Pure units | Vitest, **table-driven** | `searchProducts` (D2: "men" excludes women's, "MENS" = "Mens", "t-shirt" matches "T Shirt", "jackets" matches "jacket", "(" returns `[]`), `selectCategoryTopRated` (D1, including the fallback), `slugify`, `toCents`, Fake Store mapper, `composeEnquiryEmail`, env parsing (including the `"false"` trap and `.env.example` matching the schema) |
| Services | Vitest + in-memory fakes | `CatalogueService`; `EnquiryService` (recording email sender, fixed clock) |
| Repository contract | Vitest, **one shared suite** | `runProductRepositoryContract(makeRepo)` runs against the fixture source and against Fake Store with a stubbed `fetch` serving the recorded payload. **Any new data source must pass it.** |
| Adapters | Vitest, injected `fetch` stub | Fake Store: timeout, retry once, invalid payload, single-flight, failures not cached, stale-on-error. Image fetcher: allowlist, content type, size cap. **SMTP sender through nodemailer `jsonTransport`**, asserting the real composed headers and body with no network |
| HTTP integration | Vitest + supertest on `createApp(fakes)` | Every endpoint's success and error paths. **Every response body is `parse`d with its contracts schema.** Also `X-Request-Id`, cache headers, 413, 415, the 429 on the 6th POST, and a strict schema rejecting `title`/`price` |
| UI | Vitest + Testing Library + user-event + **MSW** | One file per AC (below). MSW runs with `onUnhandledFrame: 'error'`; responses come from typed factories (`makeProductDto()`). **Handlers never implement business logic.** Each test uses a fresh `QueryClient` with retries off. Queries use roles and labels only. |
| Smoke (Should) | `scripts/smoke.sh` (CI and local) | `PRODUCT_SOURCE=fixture docker compose up -d --wait`. Then, through :8080: health returns ok; top-rated has 5 items; POSTing an enquiry returns 202; **Mailpit `GET /api/v1/messages` shows 1 message**, proving the sales-inbox AC end to end |
| E2E (Could) | Playwright | Click-through of all 5 ACs |

**Rules:** no real network in unit, integration or UI tests. `describe` blocks are named after the AC (e.g. `describe('AC Search: …')`). Keep `npm test` under about 15s; that matters for the live session. No coverage gate; the AC matrix below is the bar.

| AC | API tests | UI tests |
|---|---|---|
| Home | top-rated returns the chosen 5 in order and skips unknown IDs | Home renders 5 tiles in order |
| Category | a chosen product appears in its category's "Top rated"; no overlap with "others"; fallback when a category has no picks (§16.1 values); 200/404 | clicking a header category link shows the "Top rated" and "More in" sections |
| Search | the D2 table; 400 on a missing or empty `q` | type a term and click **Search** → URL has `?q=` → **the API received that `q`** → the returned tiles render; no-results state |
| Product | 200/404; the DTO has the proxied `imageUrl` and no upstream URL | clicking a tile opens the product page; an unknown ID shows NotFound; **a description containing HTML renders as plain text** |
| Enquiry | 202 sends exactly one email with the right to, from, reply-to, subject and body; 400/413/415/422/429/502 | Enquire → form → client validation → submit → "Thank you"; a server error shows an alert and keeps the values |

---

## 14. Observability and operations
- **Logs:** pino JSON on stdout, one line per request: `{ reqId, method, route, status, durationMs }`.
- **Events:** `catalogue.source_selected` (at startup), `catalogue.stale_served`, `catalogue.top_rated_fallback`, `merchandising.unknown_id`, `enquiry.accepted`, `enquiry.failed`.
- **Request ID:** taken from `X-Request-Id` if it matches `^[A-Za-z0-9-]{1,64}$` (nginx sets it), otherwise generated. Echoed in the response and in problem bodies.
- **Health:** liveness only, with no upstream dependency, so a Fake Store outage never gets healthy containers restarted.
- **Shutdown:** on `SIGTERM`/`SIGINT`, stop accepting connections, finish in-flight requests, and force exit after 10s.

---

## 15. Tooling, versions and conventions

### 15.1 Version matrix (✅ checked against the npm registry 2026-11-20; pin with `^` unless noted)

| Package | Use | Why / gotcha |
|---|---|---|
| Node.js **24 LTS** | `.nvmrc` = `24`; images `node:24-alpine`; `engines: ">=24"` | Matches the dev machine (v24.22). Node 26 is the Active LTS; moving is a one-line change, so log it as a decision |
| **TypeScript `~6.0.3`** | all workspaces | ⚠️ **Not 7.x** (npm `latest` is 7.0.2): `typescript-eslint` 8.73 requires `typescript <6.1`. Set `types` explicitly in every tsconfig |
| **ESLint `^9`** + `typescript-eslint ^8.73` + `eslint-config-prettier` | flat config | ⚠️ **Not ESLint 10**: `eslint-plugin-jsx-a11y` 6.10 supports up to ESLint 9 |
| `eslint-plugin-react-hooks ^7` · `eslint-plugin-jsx-a11y ^6.10` · `prettier ^3.10` | web lint · formatting | |
| `koa ^3.3` + `@types/koa ^3` | API | Koa 3: async middleware only |
| `@koa/router ^15.7` | routing | **Ships its own types; don't install `@types/koa__router`.** `import { Router } from '@koa/router'` |
| `@koa/bodyparser ^6.1` | JSON body | `import { bodyParser } from '@koa/bodyparser'` |
| `koa-ratelimit ^6` + `@types/koa-ratelimit` | enquiry limit | No bundled types. `driver: 'memory', db: new Map(), id: ctx => ctx.ip`. It writes a plain-text 429 by default, so set `throw: true` (or wrap it) to send problem+json |
| `nodemailer ^10.6` + `@types/nodemailer` · `pino ^10` | email · logs | |
| **`zod ^4.6`** | contracts, env, upstream, config | v4 API: `z.email()`, `z.flattenError()`, `.strict()`. Don't use v3 idioms |
| `react` / `react-dom ^19.3` · `@tanstack/react-query ^5` | web | |
| **`react-router ^8.5`** | routing | ⚠️ **`react-router-dom` no longer exists in v8.** Import from `react-router` (DOM pieces from `react-router/dom`, per the installed docs). ESM only; needs Node ≥22.22 and React ≥19.2.7 |
| `vite ^8.3` + `@vitejs/plugin-react ^6` | web build | plugin-react 6 requires Vite 8 |
| `react-hook-form ^7.92` + `@hookform/resolvers ^7` | enquiry form | resolvers 7 supports zod 4 |
| `vitest ^5.1` + `@vitest/coverage-v8` · `jsdom` | tests | Vitest 5 needs Node 22.12+, 24 or 26+ |
| `msw ^3` | web tests | `http`, `HttpResponse` from `msw`; `setupServer` from `msw/node` |
| `@testing-library/react ^16.3` · `user-event ^14.6` · `jest-dom ^8` · `supertest ^7.3` | tests | |
| `tsx ^4.23` · `concurrently ^10` | dev runner | |
| `@playwright/test ^1.65` · `pino-pretty` | Could only | |

**Allowed runtime dependencies.** Anything else needs a one-line justification in DECISIONS.md.
- **api:** `koa`, `@koa/router`, `@koa/bodyparser`, `koa-ratelimit`, `nodemailer`, `pino`, `zod`, `@catalogue/contracts`
- **web:** `react`, `react-dom`, `react-router`, `@tanstack/react-query`, `react-hook-form`, `@hookform/resolvers`, `zod`, `@catalogue/contracts`
- **contracts:** `zod`

### 15.2 TypeScript
- `tsconfig.base.json` sets: `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `verbatimModuleSyntax`, `isolatedModules`, `skipLibCheck`, `resolveJsonModule`, `forceConsistentCasingInFileNames`.
- `api` and `contracts`: `module`/`moduleResolution` `NodeNext`; relative imports **must use the `.js` extension**. `contracts` emits ESM and `.d.ts` to `dist`.
- `web`: `moduleResolution: "Bundler"`, `jsx: "react-jsx"`, `noEmit`, `types: ["vite/client"]`.
- All packages are ESM (`"type": "module"`). Use `node:` prefixes for built-ins. No `any`. No `!` non-null assertions without a comment.

### 15.3 ESLint guardrails (the architecture as code)
- **Type-aware lint:** `typescript-eslint` `recommendedTypeChecked` (catches floating promises, e.g. an un-awaited `next()` in Koa) and `consistent-type-imports`.
- **api import rules** (`no-restricted-imports`):
  - `src/domain/**` may import only within `domain/`.
  - `src/{ports,services}/**` must not import `**/adapters/**`, `**/http/**`, `koa`, `@koa/*` or `nodemailer`.
  - `src/http/**` must not import `**/adapters/**`. Only `composition-root.ts` imports adapters.
- **`fetch` is restricted** (`no-restricted-globals: ['fetch']`) everywhere except `api/src/adapters/**`, `api/scripts/**` and `web/src/shared/api/**`.
- **web presentational rule:** `src/features/*/components/**` and `src/shared/ui/**` must not import `@tanstack/react-query`, `**/api`, `**/queries`, `**/mutations` or `**/shared/api/**`.
- **web ban on `fakestoreapi`:** `no-restricted-syntax` rejects any `Literal` or `TemplateElement` containing `fakestoreapi` in `apps/web`.
- **Dangerous sinks:** `no-eval`, `no-implied-eval` and `no-new-func` everywhere; in `apps/web`, `no-restricted-syntax` also bans the `dangerouslySetInnerHTML` attribute.
- **web plugins:** `react-hooks/recommended` and `jsx-a11y/recommended`.

### 15.4 npm scripts
Package names are `@catalogue/contracts`, `@catalogue/api` and `@catalogue/web`, all `private: true`. List `workspaces` in build order: `["packages/contracts", "apps/api", "apps/web"]`.

| Root script | Runs |
|---|---|
| `build:contracts` | `npm run build -w @catalogue/contracts` |
| `dev` | `docker compose up -d mailpit && npm run build:contracts && concurrently -k -n api,web "npm run dev -w @catalogue/api" "npm run dev -w @catalogue/web"` |
| `build` · `typecheck` · `test` | `build:contracts`, then `--workspaces --if-present` |
| `lint` · `format` · `format:check` | `eslint .` · `prettier --write .` · `prettier --check .` |
| **`verify`** | `build:contracts && format:check && lint && typecheck && test`: **the gate for every commit and for CI** |
| `snapshot` (api workspace) | `tsx scripts/snapshot-fakestore.ts`: re-records the fixture |

### 15.5 Branching strategy and commit conventions

**Model: GitHub Flow with one feature branch.** The brief fixes the shape: *"build on a feature branch and raise a PR into `main` in your own repo. Leave it open."*

```
main                           ●  baseline: .gitignore + README stub, then never touched
                                \
feature/product-catalogue-poc    ●─●─●─●─●  ●─●─●  ●─●─●─●─●─●  ●─●  ●─●─●─●  ●─●─●  ──► PR into main (left OPEN)
                                 P0         P1     P2           P3   P4       P5  ▲ tag: submission
```

- **Why one branch:** the brief asks for one PR. The phases are sequential, each building on the previous phase's contracts, so a branch per phase would only add merge overhead. Reviewers get one diff and a linear history that reads as the story of the build.
- **Rejected:** stacked PRs per phase (more ceremony than the brief asks for), and trunk-based work on `main` (the PR would no longer show the solution).

**One-time setup** (✅ git here is 2.25, which has no `git init -b`; `gh` isn't installed, so use the GitHub web UI):
1. On GitHub, create an **empty** repository named `product-catalogue-poc`: no README, `.gitignore` or licence. Otherwise the remote `main` starts from a different first commit and the first push is rejected.
2. Visibility: **private** is recommended. The brief allows it, and you add the reviewers as collaborators when you submit. On GitHub Free, private repos may not offer draft PRs or branch protection; nothing in this plan depends on either.
3. Locally:
   ```bash
   mkdir product-catalogue-poc && cd product-catalogue-poc
   git init && git checkout -b main
   # add .gitignore (node_modules, dist, coverage, .env, .env.*, !.env.example, *.log, .DS_Store) and a one-line README.md
   git add .gitignore README.md && git commit -m "chore: initial commit"
   git remote add origin <repository URL> && git push -u origin main
   git checkout -b feature/product-catalogue-poc && git push -u origin feature/product-catalogue-poc
   ```

**Rules**

| Rule | Why |
|---|---|
| No commits to `main` after the baseline commit | the PR diff must contain the whole solution |
| Commit only when `npm run verify` is green | every commit builds and passes, so any commit can be checked out and the history can be bisected |
| One logical change per commit; Conventional Commits with a scope: `repo`, `contracts`, `api`, `web`, `infra`, `ci`, `docs` | the history reads as the story of the build |
| The commit body says *why*, including notable AI corrections (e.g. "AI used substring search; replaced with word-prefix, see D2") | reviewers assess how you directed the AI |
| AI-assisted commits carry a `Co-Authored-By:` trailer naming the model | transparent attribution |
| A human reviews the diff before every commit and does every push; agents may stage changes and propose messages | "you own every line" |
| No squashing and no force-pushes once the PR exists; review findings become new `fix:`, `test:` or `refactor:` commits | the review process stays visible and reviewers' links keep working |
| Push at least at the end of every phase | off-machine backup and CI feedback |

**CI and PR cadence**
- `ci.yml` arrives in **P0** with two jobs: `verify` (`node-version-file: .nvmrc`, npm cache) and `security` (§10.7). It runs on `push` to any branch and on `pull_request` into `main`, with top-level `permissions: contents: read` and a `concurrency` group that cancels superseded runs. The compose smoke job is added in P5.
- Open the PR into `main` right after P0 is pushed, as a **draft** if available, so CI results and the description build up as you go. If drafts aren't available, open it at the end of P4. Finish the description (§17.5) in P5 and mark it ready for review. **Never merge it.** If it's merged after the assessment, use a merge commit rather than a squash, so the phase history survives.

**Commit map** (the target sequence; adjust as needed, but keep every commit green)

| Phase | Commits |
|---|---|
| P0 | `docs: add implementation plan` · `chore(repo): scaffold npm workspaces, TypeScript, ESLint and Prettier` · `chore(repo): add agent instructions and lint-enforced architecture rules` · `ci: add verify workflow` · `docs: add DECISIONS and AI_USAGE skeletons` |
| P1 | `feat(api): add health endpoint, config and app composition` · `feat(web): add app shell that checks API health` · `build: add Dockerfiles, nginx config and compose stack with Mailpit` |
| P2 | `feat(contracts): add product, category and problem schemas` · `feat(api): add domain model, errors and ports` · `feat(api): add Fake Store adapter with upstream validation and caching` · `feat(api): add fixture source, snapshot script and repository contract tests` · `feat(api): add catalogue service with top-rated selection and search` · `feat(api): expose catalogue endpoints, image proxy and problem+json errors` |
| P3 | `feat(contracts): add enquiry schema` · `feat(api): add enquiry endpoint with SMTP email and rate limit` |
| P4 | `feat(web): add layout, routing, API client and design tokens` · `feat(web): add home, category and product pages` · `feat(web): add search` · `feat(web): add enquiry form and thank-you state` |
| P5 | `ci: add compose smoke test` · `docs: write README, DECISIONS and AI_USAGE` · `docs: record time spent` |

Any `fix:`, `test:` or `refactor:` commits from reviews sit between these. Keep them: they're evidence of review.

**Submission and freeze** (the last steps of P5)
1. The fresh-clone run passes, CI is green, the PR description is final, and the PR is marked ready for review (not merged).
2. If the repo is private, add the reviewers named in the email as collaborators. Then check the links work: logged out for a public repo, or ask a collaborator for a private one.
3. Tag what you submit: `git tag -a submission -m "Submitted for review" && git push origin submission`.
4. Reply to the email with the repository and PR links, **within 3 days** of receiving it.
5. **Freeze:** no pushes to the branch after submitting. Anything later, such as rehearsing for the live change (§16.3), goes on a new branch from the tag: `git checkout -b practice/live-change submission`.

---

## 16. Work plan (phase-gated)

### Development loop (every task)
1. **Give the agent one task**, naming the spec sections it needs (e.g. *"P2: Fake Store adapter. Follow PLAN §5.2, §7 and §15.1. Tests first."*). One task per prompt, never a whole phase.
2. **Spec-first TDD for every development task.** Derive a scoped spec and observable examples from this plan before editing production code. Write and run the relevant tests first, confirm each fails for the expected reason, implement the smallest change that passes, and refactor with tests green. Use reproducible smoke checks for behavior that needs a running stack. For business rules, use the agreed cases in §16.1 and §8.3. The walking skeleton has a [Phase 1 specification](PHASE-1-SPEC.md).
3. The agent implements; `npm run verify` must be green.
4. **Review the diff yourself** (`git diff`): layering, naming, error paths, scope creep. Ask for fixes, or fix by hand.
5. **Record as you go:** new assumptions → `DECISIONS.md`; AI mistakes → the `AI_USAGE.md` mistake log (written by you); prompts that worked → `AI_USAGE.md`.
6. **Commit** following §15.5.

**Phase gate (end of every phase):** the phase's Definition of Done passes → push → CI green → log the time.

| Phase | Tasks | Definition of Done | Est. |
|---|---|---|---|
| **P0: Repo and guardrails** | §15.5 setup; root workspace config; tsconfig base; ESLint with the §15.3 guardrails; Prettier; `.editorconfig`, `.nvmrc`, `.gitignore`, `.dockerignore`; empty `contracts`/`api`/`web` packages that build; `AGENTS.md` + `CLAUDE.md` (Appendix A); `docs/PLAN.md`; `DECISIONS.md` and `AI_USAGE.md` skeletons; `ci.yml` with the verify and security jobs (§10.7); `.github/dependabot.yml`; start the time log; push; open the PR (draft if available) | `npm ci && npm run verify` green; `main` and the feature branch pushed; both CI jobs green on the branch | 30m |
| **P1: Walking skeleton** | API: env, logger, `createApp`, composition root, `server.ts` with graceful shutdown, `/api/health`. Web: a shell page showing the result of `/api/health` (Vite proxy). Both Dockerfiles, `nginx.conf` (proxy, SPA fallback, headers), `docker-compose.yml` with Mailpit and container hardening (§10.4), `.env.example` | **From a fresh clone in an empty temporary directory:** `time (docker compose build --no-cache --pull && docker compose up -d --wait)` finishes well under 10 minutes; http://localhost:8080 shows "API: ok"; http://localhost:8025 loads; `docker compose down` is clean. **The riskiest constraint (TC4) is retired before any feature work.** | 25m |
| **P2: Catalogue API** | contracts schemas; domain, errors, ports; Fake Store client, schema, mapper, cached loader; fixture loader + `snapshot` script + recorded JSON + placeholder fetcher; in-memory repository; merchandising source; `top-rated.ts`; `search.ts`; `CatalogueService`; presenters; middleware; routes; image fetchers; repository contract suite | verify green; the §16.1 checks return exactly the expected values in both `PRODUCT_SOURCE` modes (images: PNG vs SVG). **→ Architecture review gate (§16.2) before any UI depends on the contract.** | 50m |
| **P3: Enquiry API** | contracts enquiry schema (strict); `EnquiryService`; `composeEnquiryEmail`; `SmtpEmailSender`; `require-json` middleware; rate limit; POST route | verify green; with `npm run dev`, a `curl` POST returns 202 and the email in Mailpit has the right reply-to and subject; the 6th POST within 10 minutes returns 429 | 25m |
| **P4: Web** | providers and router; Layout with CategoryNav and SearchForm; `http.ts` + `ApiError`; queries and mutations; ProductTile, Grid and Details; Home, Category, Search, Product, NotFound, RouteError; EnquirySection, Form and ThankYou; tokens and global CSS; page titles; MSW setup and factories; one test file per AC | verify green; manual click-through of all 5 ACs with `npm run dev`; keyboard-only pass of the enquiry flow; checked at 375px | 60m |
| **P5: Hardening, docs, submit** | `scripts/smoke.sh` + the CI smoke job; README, DECISIONS, AI_USAGE, SECURITY (§17); self-review (§16.2); screenshots or GIF; finish the PR description; **repeat the timed fresh-clone run**; submission steps (§15.5) | PR open and ready for review (not merged); CI green; every row of §18 ticked; `submission` tag pushed; links sent | 40m |

**Total: about 3h50m with the Should items, about 2h55m for Must only.** The brief allows going over if you're honest about it, so log real times (§17.4). Planning time already spent counts as *planning*.

### 16.1 Expected results (✅ computed from the live data, 2026-11-20; seed config from Appendix B)

| Check | Expected |
|---|---|
| `GET /api/v1/collections/top-rated` | IDs `3, 5, 11, 12, 18` (in that order) |
| `GET /api/v1/categories` | `electronics`, `jewelery`, `mens-clothing`, `womens-clothing` |
| `…/categories/electronics/products` | topRated `11, 12`; others `9, 10, 13, 14` |
| `…/categories/jewelery/products` | topRated `5`; others `6, 7, 8` |
| `…/categories/mens-clothing/products` | topRated `3`; others `1, 2, 4` |
| `…/categories/womens-clothing/products` | topRated `18`; others `15, 16, 17, 19, 20` |
| **Fallback** (unit test with the chosen list = `["3"]`) | electronics `12, 11, 9` (a tie on 4.8 stars, broken by review count) · jewelery `5, 6, 7` · womens-clothing `18, 19, 17` · mens-clothing stays chosen: `3` |
| `?q=men` and `?q=MENS` | `2, 3, 4, 1` (**no women's products**; plain substring search would return 13) |
| `?q=women's` | `5, 15, 16, 17, 18, 19, 20` |
| `?q=jackets` · `?q=shirts` · `?q=t-shirt` | `3, 15, 16, 17` · `2, 20` · `2, 20` |
| `?q=rings` · `?q=gold%20ring` · `?q=ssd` | `7` · `7` · `10, 11` |
| `?q=(` · `?q=xyz123` · `?q=dress` | `[]` (200, empty) |
| `GET /api/v1/products` (no `q`) or `?q=%20` | 400 `VALIDATION_FAILED` |
| `GET /api/v1/products/999` · `/products/abc` | 404 problem+json (even though upstream returns 200 with an empty body) |
| `GET /api/v1/products/1/image` | 200 `image/png` (fakestore mode) · `image/svg+xml` (fixture mode) |

### 16.2 Review gates
**Architecture review gate (end of P2), done by the human before any UI work.** Check that:
- the ports match §5.2
- presenters never leak `imageSourceUrl`
- the error contract matches §6
- the lint guardrails pass and haven't been loosened

Record findings in AI_USAGE.md.

**Self-review checklist before the PR ("you own every line"):**
- [ ] I've read every file in the diff and can explain every dependency and decision.
- [ ] Every commit on the branch is green in CI, and nothing has been committed to `main` since the baseline.
- [ ] Lint guardrails pass; no Fake Store types outside `adapters/products/fakestore/`; no `fakestoreapi` in `apps/web`.
- [ ] No secrets and no `.env` committed (`git ls-files | grep -i env` shows only `.env.example`).
- [ ] Error paths are tested; no `any`, no stray `console.log`, no unexplained TODOs.
- [ ] The security job is green (`npm audit`, gitleaks), and `SECURITY.md` matches what was actually built.
- [ ] README instructions tested from a fresh clone; time log complete; the AI mistake log was written by me.

### 16.3 Live-change rehearsal (after submission, on `practice/live-change`)
The 45-minute follow-up includes a live change. Rehearse three likely asks. **Each should touch at most 3 source files plus one test.** If one doesn't, that's a design smell worth knowing about before the interview.
1. **Add a "quantity" field to the enquiry:** `contracts/enquiry.ts`, `EnquiryForm.tsx`, `enquiry-email.ts`, plus a test.
2. **Change the top-rated picks:** edit `merchandising.json`, then `docker compose restart api` (the config is bind-mounted).
3. **Make search title-only:** `domain/search.ts`, plus a test.

---

## 17. Deliverables

### 17.1 README.md
1. What this is (one paragraph) and a screenshot or GIF.
2. **Quick start**: one command and the URLs, plus how to try each AC (what to click, where the email shows up).
3. **Stack and why** (TC1): React + Vite + TypeScript; Koa (minimal async middleware, so the architecture is ours rather than a framework's; alternatives considered: Express, Fastify, NestJS); the shared contracts package; Mailpit (a real SMTP inbox with no account).
4. Architecture: a Mermaid diagram (GitHub renders it) and the swap-points table.
5. Configuration: the env table, including how to run offline (`PRODUCT_SOURCE=fixture`).
6. Development and testing commands.
7. **Where to change things:**

   | Change | File(s) |
   |---|---|
   | Top-rated picks | `apps/api/config/merchandising.json`, then restart the api |
   | Theme | `tokens.css` |
   | Search rule | `domain/search.ts` |
   | Enquiry fields | `contracts/enquiry.ts`, `EnquiryForm.tsx`, `enquiry-email.ts` |
   | Data source | `PRODUCT_SOURCE` + `adapters/products/` |
   | Email provider | `adapters/email/` |
8. Troubleshooting: port busy → `WEB_PORT=8081 docker compose up`; Fake Store down → `PRODUCT_SOURCE=fixture`.
9. Time spent, and links to DECISIONS, AI_USAGE, SECURITY and docs/PLAN.

### 17.2 DECISIONS.md (sections mirror the brief)
1. **Assumptions** where the ACs were unclear (D1–D3, D5, D7, §8.4), plus *Assumptions (agent)* logged during the build.
2. **Decisions** in short ADR form (context · decision · alternatives · consequences): monorepo; Koa; ports and adapters; D4, D6, D8–D13; RFC 9457; same-origin proxy; Mailpit; Node 24 vs 26; TypeScript 6 vs 7; every dependency beyond §15.1.
3. **Dropped or simplified, and why** (the Won't list in §2).
4. **How the design grows beyond the PoC:** the §3.3 table, *including its caveats*, and the AWS path (§12.4).
5. **Next day, prioritised:**
   1. enquiry persistence with an outbox and retries
   2. CAPTCHA
   3. per-category curation in a CMS
   4. Playwright E2E in CI
   5. OpenAPI generated from the zod contracts
   6. an SES API adapter and IaC (CDK)
   7. image optimisation and a CDN
   8. OpenTelemetry
   9. SSR if organic search matters
6. **Deviations from plan:** where the build departed from this spec, and why.

### 17.3 AI_USAGE.md (written by the human; agents may only suggest entries)
- **Tools and models** (e.g. Claude Code with Claude Opus 5.5) and what each was used for.
- **Agent instruction files:** `AGENTS.md` (the cross-tool standard) and `CLAUDE.md` (which imports it). Why the rules are lint-enforced.
- **Plan or spec:** `docs/PLAN.md` and how it evolved. v1 → gap analysis against the brief → v2, with live verification of the API, registry and data → **an independent reviewer agent** given only the brief and the plan, not my conclusions → triaged into v3.
- **Key moments** (true, from planning; add build moments as they happen):
  1. v1 hot-linked images from fakestoreapi.com, which breaches TC2. Caught in the requirements trace; fixed with the image proxy, which also lets the CSP enforce TC2.
  2. A default install would pull TypeScript 7 and ESLint 10, both incompatible with the lint plugins' peer ranges. Caught by checking peer dependencies **before** building.
  3. Substring search returned women's products for "men", and prefix-only search missed plurals. Caught by running each rule against the real data (D2).
  4. Fake Store returns `200` with an empty body for unknown IDs, and `403` to `HEAD`. Found by probing the API rather than trusting assumptions.
  5. **The independent review round:**
     - About half its 21 findings were already fixed, because it reviewed an earlier version.
     - It caught real issues: "top rated" was still inconsistent (filling up to 3 per category inflated the owner's 5 picks); the email composer sat in `adapters/` while the service called it, breaking v2's own lint rule; and Docker came too late for a pass/fail constraint.
     - Two of its suggestions were wrong and were declined: redacting `*.message`/`*.name` would blank error messages and category names, and a console email transport would make dev differ from production.
- **Mistake log** (table: what the AI did · how it was caught · fix · commit), written by the human during the build. Never pre-written.

### 17.4 Time spent
Actual minutes per phase, written by the human from a running log and rolled up into the brief's four buckets (**planning · building · testing · reviewing**). Put it in the README and the PR.

### 17.5 PR description (it's assessed)
Title: `feat: product catalogue PoC (React + Koa), a foundation built to evolve`. Sections:
- Summary
- How to run (online and offline)
- **AC checklist** with how to verify each, plus screenshots or a GIF
- Architecture diagram and swap points, with caveats
- Top 5 decisions (link to DECISIONS)
- What's cut and why
- Tests and CI status
- Security notes, including "the CSP makes the browser enforce TC2"
- AI usage summary (link)
- Time spent
- Known limitations

### 17.6 SECURITY.md (one page)
1. Scope, and what the brief does and doesn't require (§10.1).
2. Data inventory, and why there's no database (§10.2, D13).
3. The threat model table (§10.3).
4. Controls in place, and how each is verified by tests or CI (§10.4, §10.7).
5. Privacy notes (§10.5).
6. Production hardening backlog: TLS and HSTS at CloudFront, Secrets Manager or an IAM role, WAF rate rules, CAPTCHA, log retention.
7. How to report a vulnerability: open a private security advisory on the repository.

The ISMS mapping (§10.6) stays in this plan as interview preparation. Copy it in only if you want to.

---

## 18. Requirements traceability

| Brief requirement | Covered by |
|---|---|
| TC1: client and backend from the list, reasons in the README | React + TS (Vite) / Node + TS (Koa); README "Stack and why" |
| TC2: no Fake Store calls from the client | web calls only relative `/api/v1` (a single lint-enforced `fetch` wrapper; `fakestoreapi` banned in web); images proxied (D4); **CSP `img-src`/`connect-src 'self'` makes the browser enforce it** |
| TC3: AWS-compatible infra | stateless containers + static build; §12.4 |
| TC4: under 10 minutes, one or two commands | `docker compose up --build` with zod defaults; **walking skeleton timed in P1**, re-timed in P5; CI smoke; offline fixture mode |
| TC5: no secrets; `.env.example` | §10, §11; `.gitignore` + `.dockerignore`; `.env.example` ↔ schema test |
| TC6: no paid services or accounts | Fake Store (free), Mailpit (local), everything else open source |
| AC Home | `merchandising.json` → `GET /collections/top-rated` → HomePage (D1) |
| AC Category | header category links → `GET /categories/:slug/products` → "Top rated" + "More in" (D1) |
| AC Search | header search form + **Search** button → `/search?q=` → `GET /products?q=` (D2) |
| AC Product page | ProductTile link → `/products/:id` → `GET /products/:id` |
| AC Enquiry | Enquire → EnquiryForm → `POST /enquiries` → `EmailSender` → Mailpit; thank-you only after the relay accepts (D3); smoke test checks the Mailpit API |
| Submission 1–2: repo, feature branch, open PR into `main` | §15.5 (one feature branch; PR left open and never merged; reviewer access; `submission` tag; reply within 3 days); P0, P5 |
| Submission 3: source including tests | §13; CI |
| Submission 4–7: README, DECISIONS, AI_USAGE, time | §17 |
| Selection criterion: "validation and security basics" | §10: threat model, controls checklist, lint bans, CI security checks, container hardening; `SECURITY.md` (§17.6) |
| Enquiry PII (implied by the Enquiry AC) | data minimisation, no storage (D13), no PII in logs, collection notice (§10.2, §10.5) |

---

## 19. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Fake Store slow or down during review | lazy loading; TTL cache + stale-on-error + one retry; **fixture mode never cut**; troubleshooting line in the README |
| Upstream quirks (200 + empty body; `HEAD` 403; shape drift) | load-all strategy; `GET` only; zod validation at the adapter |
| The workspace Docker build breaks the 10-minute run | **walking skeleton in P1**; root build context; manifests copied first; `**/node_modules` ignored; contracts built first; timed fresh-clone runs in P1 and P5; CI smoke |
| Port conflicts on the reviewer's machine | `WEB_PORT` / `API_PORT` / `MAILPIT_UI_PORT` overrides |
| The AI uses outdated library APIs | version matrix with gotchas (§15.1); "read the installed types" rule; typecheck gate |
| The AI drifts from the architecture | lint guardrails (§15.3); one task per prompt; architecture review gate after P2 |
| Made-up AI-usage or time entries | integrity rule (§0.7): the human writes those entries |
| Scope creep or time overrun | MoSCoW tiers, cut order, time log |
| The interviewer challenges "top rated" or search semantics | D1 and D2, with alternatives and real-data evidence (§16.1) |
| A live change in the interview goes badly | the §16.3 rehearsal; `npm test` kept under about 15s; one-command `npm run dev` |
| Reviewer on Apple Silicon | official multi-arch images only; no `platform:` pins |
| A secret is committed by mistake | no secrets are needed in the first place; `.gitignore` and `.dockerignore`; gitleaks scans the full history in CI |
| Customer PII is exposed | enquiries aren't stored (D13); no PII in logs; collection notice; Australian-region providers in production (§10.5) |

---

## Appendix A: `AGENTS.md` (commit in P0; `CLAUDE.md` contains `@AGENTS.md` plus any Claude-specific notes)

```markdown
# AGENTS.md
Product catalogue PoC. Spec: docs/PLAN.md (source of truth; read §0 first).
Workspaces: packages/contracts (zod schemas + types) · apps/api (Koa) · apps/web (React + Vite).

## Commands
- `npm run verify`: format check, lint, typecheck, tests. MUST pass before you say a task is done.
- `npm run dev`: Mailpit + api :3000 + web :5173.  `docker compose up --build`: what the reviewer runs.
- `PRODUCT_SOURCE=fixture` runs fully offline. `npm run snapshot -w @catalogue/api` re-records the fixture.

## Architecture rules (lint-enforced; never loosen the lint config to get green)
- api: http → services → ports ← adapters; domain imports nothing outside domain.
  Only composition-root.ts imports adapters.
- The only interfaces are the ports in PLAN §5.2. Services, mappers and presenters are concrete.
- `fetch` only in api/src/adapters/**, api/scripts/** and web/src/shared/api/http.ts.
- Fake Store types never leave api/src/adapters/products/fakestore/. Never call Fake Store per ID.
- Responses go through presenters, using @catalogue/contracts schemas. Contract change order:
  contracts → api → web.
- Validate every boundary with zod. Never build a RegExp from user input.
- Web: pages/containers own data; components/ and shared/ui are presentational (no react-query,
  api, queries or mutations imports). Render `imageUrl` verbatim; never build URLs.

## Conventions
- TypeScript strict, ESM, kebab-case files (React components PascalCase), no `any`.
- NodeNext packages use `.js` extensions in relative imports.
- Styling: CSS Modules + tokens in shared/theme; no hard-coded colours or fonts.
- Tests: colocated *.test.ts(x); no real network; Testing Library queries by role/label; MSW handlers
  never implement business logic; describe blocks named after the acceptance criterion.
- Never log PII (name, email, phone, message bodies) or request bodies. Never commit .env or secrets.
- Never use dangerouslySetInnerHTML, eval or new Function (lint-enforced).

## Dependencies
- Use the version matrix and allowed-dependency list in PLAN §15.1 (TypeScript ~6.0, ESLint 9,
  react-router 8 with no react-router-dom, zod 4, Koa 3). New runtime deps need a DECISIONS.md line.
- Installed majors may be newer than your training data: read node_modules/<pkg> types or README
  before using an unfamiliar API. Never downgrade to match memory.

## Working agreement
- Implement only the current task in PLAN §16. Items in §2 "Won't" are out of scope.
- Unclear? Choose the simplest option consistent with the spec, add it to DECISIONS.md →
  "Assumptions (agent)", continue.
- Git: work only on feature/product-catalogue-poc, never on main. Commit only when verify is green, one
  logical change per Conventional Commit (commit map: PLAN §15.5). Never squash or force-push.
  A human reviews every diff before it's committed and does every push.
- Never write or edit time spent. Never invent AI-mistake or key-prompt entries; suggest them to the human.
```

## Appendix B: seed `apps/api/config/merchandising.json`

```json
{
  "topRatedProductIds": ["3", "5", "11", "12", "18"],
  "categoryFallbackCount": 3
}
```

The 5 picks cover all 4 categories (electronics 2, the others 1 each), so the D1 fallback never fires with seed data. Validate at boot with zod: a non-empty array of unique ID strings matching the D6 pattern, and `categoryFallbackCount` an integer from 1 to 12.
