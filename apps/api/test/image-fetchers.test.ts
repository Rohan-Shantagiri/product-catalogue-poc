import { describe, expect, it, vi } from "vitest";
import { HttpImageFetcher } from "../src/adapters/images/http-image-fetcher.js";
import { PlaceholderImageFetcher } from "../src/adapters/images/placeholder-image-fetcher.js";
import { UpstreamUnavailableError } from "../src/domain/errors.js";

import type { ImageFetcher } from "../src/ports/image-fetcher.js";

function getImage(images: ImageFetcher, url: string) {
  const { fetch: loadImage } = images;
  return loadImage(url);
}

const imageUrl = "https://images.example.com/item.png";

function png() {
  return new Response(Uint8Array.of(137, 80, 78, 71), {
    headers: { "content-type": "image/png" },
  });
}

describe("P2-05: image proxy transport", () => {
  it("allows an image GET, blocks redirects, and reuses the cached bytes", async () => {
    const transport = vi.fn(() => Promise.resolve(png()));
    const images = new HttpImageFetcher(["images.example.com"], 100, transport);
    const expected = {
      contentType: "image/png",
      body: Uint8Array.of(137, 80, 78, 71),
    };
    expect(await getImage(images, imageUrl)).toEqual(expected);
    expect(await getImage(images, imageUrl)).toEqual(expected);
    const abortSignal: unknown = expect.any(AbortSignal);
    expect(transport).toHaveBeenCalledExactlyOnceWith(imageUrl, {
      method: "GET",
      redirect: "error",
      signal: abortSignal,
    });
  });

  it.each([
    "https://images.example.com.other.test/item.png",
    "file:///etc/example",
    "http://user:password@images.example.com/item.png",
  ])("rejects disallowed URLs before transport", async (url) => {
    const transport = vi.fn();
    const images = new HttpImageFetcher(["images.example.com"], 100, transport);
    await expect(getImage(images, url)).rejects.toBeInstanceOf(
      UpstreamUnavailableError,
    );
    expect(transport).not.toHaveBeenCalled();
  });

  it.each([
    [
      "a non-image media type",
      () => new Response("page", { headers: { "content-type": "text/html" } }),
    ],
    [
      "a redirect response",
      () =>
        new Response(null, {
          status: 302,
          headers: { location: "https://other.example.com" },
        }),
    ],
    [
      "an oversized declared body",
      () =>
        new Response("image", {
          headers: { "content-type": "image/png", "content-length": "5242881" },
        }),
    ],
    [
      "an oversized streamed body",
      () =>
        new Response(new Uint8Array(5242881), {
          headers: { "content-type": "image/png" },
        }),
    ],
  ])("rejects %s", async (_label, respond) => {
    const images = new HttpImageFetcher(["images.example.com"], 100, () =>
      Promise.resolve(respond()),
    );
    await expect(getImage(images, imageUrl)).rejects.toBeInstanceOf(
      UpstreamUnavailableError,
    );
  });

  it("maps a timed-out transport to a public upstream failure", async () => {
    const images = new HttpImageFetcher(["images.example.com"], 5, () =>
      Promise.reject(new DOMException("timeout", "TimeoutError")),
    );
    await expect(getImage(images, imageUrl)).rejects.toBeInstanceOf(
      UpstreamUnavailableError,
    );
  });

  it("evicts the least recently used image at 50 entries", async () => {
    const transport = vi.fn(() => Promise.resolve(png()));
    const images = new HttpImageFetcher(["images.example.com"], 100, transport);
    const url = (id: number) => `https://images.example.com/${id}.png`;
    for (let id = 0; id < 50; id++) await getImage(images, url(id));
    await getImage(images, url(0));
    await getImage(images, url(50));
    await getImage(images, url(0));
    expect(transport).toHaveBeenCalledTimes(51);
    await getImage(images, url(1));
    expect(transport).toHaveBeenCalledTimes(52);
  });

  it("serves a local SVG placeholder without transport", async () => {
    const { contentType, body } = await getImage(
      new PlaceholderImageFetcher(),
      imageUrl,
    );
    expect(contentType).toBe("image/svg+xml");
    expect(new TextDecoder().decode(body)).toMatch(/<svg\b/);
  });
});
