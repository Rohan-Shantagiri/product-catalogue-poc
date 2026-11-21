import { readFile } from "node:fs/promises";
import { UpstreamUnavailableError } from "../../domain/errors.js";
import type { ImageFetcher } from "../../ports/image-fetcher.js";

export class PlaceholderImageFetcher implements ImageFetcher {
  readonly fetch = async () => {
    try {
      const body = await readFile(
        new URL("../../../assets/placeholder.svg", import.meta.url),
      );
      return { contentType: "image/svg+xml", body };
    } catch {
      throw new UpstreamUnavailableError();
    }
  };
}
