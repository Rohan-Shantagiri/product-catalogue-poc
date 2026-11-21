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

## Catalogue API

The catalogue is available at `/api/v1`. For example, open <http://localhost:8080/api/v1/collections/top-rated> for the ordered home selection, <http://localhost:8080/api/v1/categories> for categories, or <http://localhost:8080/api/v1/products?q=men> for search.

The default source is Fake Store. Set `PRODUCT_SOURCE=fixture` in your shell or `.env` and run Compose to use the bundled catalogue and local SVG images. To refresh the recorded fixture from Fake Store, run `npm run snapshot -w @catalogue/api` with Node.js 24.

## Enquiry API

Send `POST /api/v1/enquiries` with `Content-Type: application/json` and a catalogue `productId`, customer `name`, and `email`. Phone and message are optional. A successful response contains an `enquiryId` after the SMTP relay accepts the message. The local sales inbox is Mailpit.

The default limit is five JSON enquiry submissions per client IP in ten minutes. See the [Phase 3 specification](docs/PHASE-3-SPEC.md) for the delivery and request checks.

See the [implementation plan](docs/PLAN.md), [decisions](DECISIONS.md), and [AI usage notes](AI_USAGE.md).
