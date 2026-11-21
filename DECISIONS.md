# Decisions and assumptions

## Acceptance criteria assumptions

The planned rules for curation, search, enquiries, currency and category URLs are in [plan §4](docs/PLAN.md#4-decisions-copy-these-into-decisionsmd). Phases 2 and 3 implement the catalogue and enquiry decisions below.

- **D1 and D8.** Seeded merchandising picks drive the home and category lists. Categories with no picks fall back to rating, review count and then source order. Unknown configured IDs are skipped and logged.
- **D2, D5 and D7.** Search matches normalised word prefixes with title matches first. Prices use integer cents in the configured currency. Category names and sorted slugs derive from the upstream names.
- **D4, D6 and D9.** The server proxies image URLs and loads Fake Store products in one cached collection request. Fixture mode uses the recorded catalogue and a bundled image. Product IDs remain opaque outside the source adapter.
- **D10.** Catalogue JSON is versioned, list results use an envelope, and errors use shared Problem Details schemas.
- **D3, D11 and D12.** Enquiries use the catalogue product record, return 202 after SMTP accepts the message, and never send a customer confirmation. The JSON-only route counts attempts by client IP before parsing the body. Local development sends through Mailpit using the same SMTP adapter.

## Architecture and tooling

- npm workspaces keep the API, web and shared contracts independently buildable in one repository.
- React is the web client. Koa keeps transport concerns separate from the catalogue and enquiry logic.
- Node.js 24 is the project runtime. TypeScript 6 is pinned to the 6.0 series for compatibility with the selected ESLint tooling.
- ESLint's restricted import patterns cover known package names. A local path-aware rule also checks resolved relative imports, so changing the nesting of a file or re-exporting an adapter cannot bypass the layer rules.

- Phase 4 uses React Hook Form and its Zod resolver to validate enquiries with the shared contract.

## Architecture decisions

| Context                                         | Decision and consequences                                                                                                                                                                                                                   |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Keep contracts in sync across client and server | Use an npm-workspaces monorepo so contract, API, and UI changes can be tested together. Separate repositories would add an independent package release step.                                                                                |
| Own the service boundaries                      | Use Koa and constructor-injected ports. Express and Fastify offer other lightweight HTTP stacks. NestJS and a DI container would add conventions that the PoC can enforce with its existing small composition root and lint rules.          |
| Keep upstream data out of the browser           | The API loads the Fake Store collection lazily, caches it, and publishes opaque IDs and proxied images. nginx keeps API and assets same-origin and applies CSP. Direct links or calls to Fake Store would bypass that boundary.             |
| Keep client contracts stable                    | Use versioned routes, Zod schemas, list envelopes, and RFC 9457 Problem Details. Arrays and ad hoc error keys would make later pagination and client error handling harder.                                                                 |
| Reproduce the enquiry handoff                   | Use Mailpit with SMTP and a per-IP throttle. The customer sees the confirmation after the SMTP relay accepts the message. Using a console transport would skip the delivery path; persisting leads requires an outbox and retention policy. |
| Make clean installs reproducible                | Use Node.js 24 and the TypeScript 6 series from the plan, with the lockfile checked in. Node 26 and TypeScript 7 were considered. The selected versions match the repository's ESLint tooling and Docker build.                             |

## User interface

- **Phase 4 storefront polish.** Use the first curated product as the featured item, give the current category a clear selected state, and add short entrance, hover, focus, and page transitions. The featured panel gives shoppers a starting point, the selected state shows where they are, and motion helps them follow navigation. Use the images supplied by the catalogue API and respect the system's reduced-motion preference.

## Development workflow

- Adopted spec-first TDD during Phase 1. For every development task, write a scoped specification from PLAN with observable acceptance criteria and examples. Write the relevant unit or integration test first and confirm it fails for the intended reason. Implement the smallest change that passes it, then refactor with the tests green and run `npm run verify`. Use reproducible smoke checks for container and browser integration.
- The original Phase 1 code and tests were written alongside each other. The [Phase 1 specification](docs/PHASE-1-SPEC.md) and additional coverage were added during the shift to the new workflow.

## Assumptions (agent)

- Compose keeps the API listener on port 3000 for nginx and the health probe. Use `API_PORT` to change its loopback host mapping.
- Developer mode adds a Compose overlay that publishes SMTP on loopback for the host-based API. The reviewer stack keeps SMTP on the internal Compose network.

- Public product IDs use D6's opaque string grammar, including uppercase letters and underscores. Category slugs use the lowercase grammar in PLAN §6.

- Fake Store responses may have extra fields. Invalid and repeated product rows are skipped with an indexed warning, and a nonempty response with no valid products is unavailable. The snapshot recorder requires a complete valid response before replacing the fixture.
- The image fetcher denies redirects so a configured host cannot forward a request outside the allowlist. Its size cap is 5 MiB.
- Catalogue domain and service tests live in the API test directory because the import rules for those production layers exclude Vitest.

## Dropped or simplified

- The catalogue covers browsing and enquiries. Accounts, cart, checkout, and payment workflows are outside that scope.
- The sales inbox is the current enquiry record. A database, migrations, and retention controls would add a second record for the same enquiry.
- Curation uses a versioned file until the business needs an admin or CMS workflow. The in-memory product source fits the small fixture. Pagination and SEO rendering can follow when product volume or discovery warrants them.
- Mailpit keeps the real SMTP path in development. The in-memory throttle provides the initial abuse control. A CAPTCHA can be evaluated against traffic, keeping the form clear of hidden fields that browser autofill might populate.

## How the design grows beyond the PoC

| Change         | Path and caveat                                                                                                                                                                                                                                                                                                                                                |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Product source | Add an adapter behind the repository port and pass the contract suite. Map curated IDs or use SKUs when the new source has a different ID space. Push queries to the source when loading the full catalogue becomes expensive.                                                                                                                                 |
| Email          | Keep the SMTP adapter for a new relay. On ECS, an SES API adapter can use the task's IAM role. A transactional outbox is needed for durable retries.                                                                                                                                                                                                           |
| Look and feel  | Change tokens and presentational components for a reskin. New pages and navigation also change routes and containers.                                                                                                                                                                                                                                          |
| Curation       | Add a `MerchandisingSource` adapter for CMS data and keep the service selection policy.                                                                                                                                                                                                                                                                        |
| Other clients  | Reuse the versioned API and shared contracts. Per-client authentication and rate limits would be separate work.                                                                                                                                                                                                                                                |
| AWS            | Serve static web assets via S3 and CloudFront, and route `/api/*` to ECS Fargate or App Runner with `/api/health`. Send stdout to CloudWatch and move deployment configuration to SSM or Secrets Manager. Replace instance-local rate limits and caches with shared controls when scaling. Put a CDN in front of product images and update the presenter URLs. |

### Future scaling

As traffic and team ownership grow, use a managed PostgreSQL database to persist catalogue and enquiry data. Move the React frontend and backend into separate repositories with independent build and deployment pipelines, connected by a versioned API contract. When catalogue browsing and enquiry processing need to scale independently, extract them into separate backend microservices. Each service owns its data.

## Next day

1. Persist enquiries with a transactional outbox and retries.
2. Add CAPTCHA based on observed abuse.
3. Move per-category curation into a CMS.
4. Add Playwright end-to-end checks in CI.
5. Generate OpenAPI from the Zod contracts.
6. Add an SES adapter and infrastructure definitions.
7. Optimise images and serve them through a CDN.
8. Add OpenTelemetry tracing.
9. Add SSR if organic search becomes a requirement.

## Deviations from plan

- The single draft pull request into `main` was opened after the Phase 4 push.
