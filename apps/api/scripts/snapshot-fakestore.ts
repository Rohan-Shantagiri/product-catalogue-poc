import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { FakeStoreClient } from "../src/adapters/products/fakestore/fakestore-client.js";
import { assertRecordableSnapshot } from "../src/adapters/products/fakestore/fakestore-schema.js";
import { loadEnv } from "../src/config/env.js";

const env = loadEnv(process.env);
const client = new FakeStoreClient({
  baseUrl: env.FAKESTORE_BASE_URL,
  timeoutMs: env.UPSTREAM_TIMEOUT_MS,
  currency: env.CATALOGUE_CURRENCY,
});
const raw = await client.downloadProducts();
assertRecordableSnapshot(raw, env.CATALOGUE_CURRENCY);

const fixtures = new URL("../fixtures/", import.meta.url);
const destination = new URL("fakestore-products.json", fixtures);
const pending = new URL(`fakestore-products.${process.pid}.tmp`, fixtures);
await mkdir(fixtures, { recursive: true });
try {
  await writeFile(pending, JSON.stringify(raw, null, 2) + "\n", "utf8");
  await rename(pending, destination);
} finally {
  await rm(pending, { force: true });
}
process.stdout.write("Recorded the Fake Store catalogue fixture.\n");
