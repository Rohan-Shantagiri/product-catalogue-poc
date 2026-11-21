import { UpstreamUnavailableError } from "../../../domain/errors.js";
import { decodeFakeStoreProducts } from "./fakestore-schema.js";

type FakeStoreOptions = {
  baseUrl: string;
  timeoutMs: number;
  currency: string;
  request?: typeof fetch;
  onInvalid?: (index: number) => void;
};

export class FakeStoreClient {
  private readonly productsUrl: string;
  private readonly request: typeof fetch;

  constructor(private readonly options: FakeStoreOptions) {
    const url = new URL(options.baseUrl);
    url.pathname = url.pathname.replace(/\/+$/u, "") + "/products";
    url.search = "";
    url.hash = "";
    this.productsUrl = url.href;
    this.request = options.request ?? fetch;
  }

  async downloadProducts(): Promise<unknown> {
    for (let attempt = 0; attempt < 2; attempt++) {
      const signal = AbortSignal.timeout(this.options.timeoutMs);
      const response = await this.request(this.productsUrl, {
        method: "GET",
        redirect: "error",
        signal,
      }).catch(() => undefined);

      if (!response) continue;
      if (!response.ok) {
        void response.body?.cancel().catch(() => undefined);
        if (response.status < 500) break;
        continue;
      }

      try {
        const payload: unknown = await response.json();
        return payload;
      } catch (error) {
        if (!signal.aborted && !(error instanceof TypeError)) break;
      }
    }
    throw new UpstreamUnavailableError();
  }

  async loadProducts() {
    const raw = await this.downloadProducts();
    return decodeFakeStoreProducts(
      raw,
      this.options.currency,
      this.options.onInvalid,
    );
  }
}
