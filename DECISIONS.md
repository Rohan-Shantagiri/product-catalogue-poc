# Decisions and assumptions

## Acceptance criteria assumptions

The planned rules for curation, search, enquiries, currency and category URLs are in [plan §4](docs/PLAN.md#4-decisions-copy-these-into-decisionsmd). Record the final behavior here as each feature is implemented.

## Architecture and tooling

- npm workspaces keep the API, web and shared contracts independently buildable in one repository.
- React is the web client. Koa will keep transport concerns separate from the catalogue and enquiry logic.
- Node.js 24 is the project runtime. TypeScript 6 is pinned to the 6.0 series for compatibility with the selected ESLint tooling.
- ESLint's restricted import patterns cover known package names. A local path-aware rule also checks resolved relative imports, so changing the nesting of a file or re-exporting an adapter cannot bypass the layer rules.

## Assumptions (agent)

## Dropped or simplified

## How the design grows beyond the PoC

## Next day

## Deviations from plan
