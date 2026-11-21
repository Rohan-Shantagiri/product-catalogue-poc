# Decisions and assumptions

## Acceptance criteria assumptions

The planned rules for curation, search, enquiries, currency and category URLs are in [plan §4](docs/PLAN.md#4-decisions-copy-these-into-decisionsmd). Phase 2 implements the catalogue decisions below.

- **D1 and D8.** Seeded merchandising picks drive the home and category lists. Categories with no picks fall back to rating, review count and then source order. Unknown configured IDs are skipped and logged.
- **D2, D5 and D7.** Search matches normalised word prefixes with title matches first. Prices use integer cents in the configured currency. Category names and sorted slugs derive from the upstream names.
- **D4, D6 and D9.** The server proxies image URLs and loads Fake Store products in one cached collection request. Fixture mode uses the recorded catalogue and a bundled image. Product IDs remain opaque outside the source adapter.
- **D10.** Catalogue JSON is versioned, list results use an envelope, and errors use shared Problem Details schemas.

## Architecture and tooling

- npm workspaces keep the API, web and shared contracts independently buildable in one repository.
- React is the web client. Koa will keep transport concerns separate from the catalogue and enquiry logic.
- Node.js 24 is the project runtime. TypeScript 6 is pinned to the 6.0 series for compatibility with the selected ESLint tooling.
- ESLint's restricted import patterns cover known package names. A local path-aware rule also checks resolved relative imports, so changing the nesting of a file or re-exporting an adapter cannot bypass the layer rules.

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

## How the design grows beyond the PoC

## Next day

## Deviations from plan
