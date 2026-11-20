# Product catalogue PoC

The catalogue will let customers browse, search and enquire about products. The walking skeleton verifies the React shell and Koa API with a shared TypeScript and Zod health contract.

## Run with Docker

```sh
docker compose up --build
```

Open the web shell at <http://localhost:8080>, the API health endpoint at <http://localhost:3000/api/health>, or Mailpit at <http://localhost:8025>. Stop the stack with `docker compose down`.

## Develop locally

With Node.js 24 and Docker running, use:

```sh
npm ci
npm run dev
```

Vite serves the shell at <http://localhost:5173> and proxies API requests to the local Koa server. Mailpit runs in Docker. Copy `.env.example` to `.env` if you need to override defaults. For Compose, use `API_PORT`, `WEB_PORT`, and `MAILPIT_UI_PORT` to change the published ports.

Run `npm run verify` for formatting, lint, type checking, and tests. Run `npm run build` to build the workspaces.

See the [implementation plan](docs/PLAN.md), [decisions](DECISIONS.md), and [AI usage notes](AI_USAGE.md).
