# AGENTS.md

Product catalogue PoC. Spec: docs/PLAN.md (source of truth; read §0 first).
Workspaces: packages/contracts (zod schemas + types) · apps/api (Koa) · apps/web (React + Vite).

## Commands

- `npm run verify`: format check, lint, typecheck, tests. MUST pass before you say a task is done.
- `npm run dev`: Mailpit + api :3000 + web :5173. `docker compose up --build`: what the reviewer runs.
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

- Use spec-first TDD for every development task. Derive acceptance examples from PLAN, write
  and run the smallest failing test, then implement, refactor, and run the phase checks. Use a
  reproducible smoke check for behavior that needs a running stack.
- Implement only the current task in PLAN §16. Items in §2 "Won't" are out of scope.
- Unclear? Choose the simplest option consistent with the spec, add it to DECISIONS.md →
  "Assumptions (agent)", continue.
- Git: work only on feature/product-catalogue-poc, never on main. Commit only when verify is green, one
  logical change per Conventional Commit (commit map: PLAN §15.5). Never squash or force-push.
  A human reviews every diff before it's committed and does every push.
- Never write or edit time spent. Never invent AI-mistake or key-prompt entries; suggest them to the human.
