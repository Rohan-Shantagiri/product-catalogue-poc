import { UpstreamUnavailableError } from "../../domain/errors.js";
import type { ImageFetcher } from "../../ports/image-fetcher.js";

const maxImageBytes = 5 * 1024 * 1024;
const maxCachedImages = 50;
type Image = Awaited<ReturnType<ImageFetcher["fetch"]>>;

export class HttpImageFetcher implements ImageFetcher {
  private readonly cache = new Map<string, Image>();
  private readonly allowedHosts: Set<string>;

  constructor(
    allowedHosts: readonly string[],
    private readonly timeoutMs: number,
    private readonly request: typeof fetch = fetch,
  ) {
    this.allowedHosts = new Set(allowedHosts);
  }

  readonly fetch = async (sourceUrl: string): Promise<Image> => {
    try {
      const url = new URL(sourceUrl);
      if (
        (url.protocol !== "https:" && url.protocol !== "http:") ||
        url.username ||
        url.password ||
        !this.allowedHosts.has(url.hostname)
      ) {
        throw new UpstreamUnavailableError();
      }

      const cached = this.cache.get(url.href);
      if (cached) {
        this.cache.delete(url.href);
        this.cache.set(url.href, cached);
        return cached;
      }

      const response = await this.request(url.href, {
        method: "GET",
        redirect: "error",
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      const contentType = response.headers
        .get("content-type")
        ?.split(";")[0]
        ?.trim()
        .toLowerCase();
      const contentLength = Number(response.headers.get("content-length"));

      if (
        !response.ok ||
        !contentType ||
        !/^image\/[a-z0-9!#$&^_.+-]+$/u.test(contentType) ||
        contentLength > maxImageBytes ||
        !response.body
      ) {
        void response.body?.cancel().catch(() => undefined);
        throw new UpstreamUnavailableError();
      }

      const body = await readBoundedImage(response.body);
      const image = { contentType, body };
      if (this.cache.size >= maxCachedImages) {
        const oldest = this.cache.keys().next().value;
        if (oldest !== undefined) this.cache.delete(oldest);
      }
      this.cache.set(url.href, image);
      return image;
    } catch {
      throw new UpstreamUnavailableError();
    }
  };
}

async function readBoundedImage(
  stream: NonNullable<Response["body"]>,
): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;

  try {
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      const value: unknown = next.value;
      if (!(value instanceof Uint8Array)) {
        void reader.cancel().catch(() => undefined);
        throw new UpstreamUnavailableError();
      }
      size += value.byteLength;
      if (size > maxImageBytes) {
        void reader.cancel().catch(() => undefined);
        throw new UpstreamUnavailableError();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  if (size === 0) throw new UpstreamUnavailableError();

  const image = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    image.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return image;
}
