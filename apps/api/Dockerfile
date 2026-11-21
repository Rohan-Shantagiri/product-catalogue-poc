FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/contracts/package.json packages/contracts/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci

COPY tsconfig.base.json ./
COPY packages/contracts/ packages/contracts/
COPY apps/api/ apps/api/
RUN npm run build:contracts && npm run build -w @catalogue/api \
    && npm prune --omit=dev \
    && mkdir -p apps/api/config apps/api/fixtures apps/api/assets

FROM node:24-alpine AS runtime
ENV NODE_ENV=production

WORKDIR /app
COPY --from=build /app/node_modules/ node_modules/
COPY --from=build /app/packages/contracts/package.json packages/contracts/
COPY --from=build /app/packages/contracts/dist/ packages/contracts/dist/
COPY --from=build /app/apps/api/package.json apps/api/
COPY --from=build /app/apps/api/dist/ apps/api/dist/
COPY --from=build /app/apps/api/config/ apps/api/config/
COPY --from=build /app/apps/api/fixtures/ apps/api/fixtures/
COPY --from=build /app/apps/api/assets/ apps/api/assets/

USER node
WORKDIR /app/apps/api
EXPOSE 3000
CMD ["node", "dist/server.js"]
