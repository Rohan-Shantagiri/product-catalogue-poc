import { readFile } from "node:fs/promises";
import { UpstreamUnavailableError } from "../../../domain/errors.js";
import { decodeFakeStoreProducts } from "../fakestore/fakestore-schema.js";

export async function loadFixtureProducts(
  currency: string,
  onInvalid?: (index: number) => void,
) {
  const path = new URL(
    "../../../../fixtures/fakestore-products.json",
    import.meta.url,
  );
  try {
    const raw: unknown = JSON.parse(await readFile(path, "utf8"));
    return decodeFakeStoreProducts(raw, currency, onInvalid);
  } catch {
    throw new UpstreamUnavailableError();
  }
}
