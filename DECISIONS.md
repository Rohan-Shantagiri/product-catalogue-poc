# Decisions and assumptions

## Acceptance criteria assumptions

The planned rules for curation, search, enquiries, currency and category URLs are in [plan §4](docs/PLAN.md#4-decisions-copy-these-into-decisionsmd). Record the final behavior here as each feature is implemented.

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

## Dropped or simplified

## How the design grows beyond the PoC

## Next day

## Deviations from plan
