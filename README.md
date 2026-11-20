# Product catalogue PoC

The catalogue will let customers browse, search and enquire about products.

React and TypeScript fit the brief's web option and let the app share runtime schemas and types with the API. The backend will use Node.js, TypeScript and Koa for a small HTTP layer around the catalogue and enquiry services.

## Phase 0 checks

Use Node.js 24 and run:

```sh
npm ci
npm run verify
```

Run `npm run dev:web` from the repository root to preview the React shell. Open the local address printed by Vite, usually `http://127.0.0.1:5173/`.

Run `npm run build` to compile all three workspaces. The web entry point renders a heading to confirm the React build. The API entry point is a build stub until the walking skeleton phase.

See the [implementation plan](docs/PLAN.md), [decisions](DECISIONS.md), and [AI usage notes](AI_USAGE.md).
