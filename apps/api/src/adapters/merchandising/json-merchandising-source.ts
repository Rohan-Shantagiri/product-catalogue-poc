import { readFileSync } from "node:fs";
import { z } from "zod";
import type {
  MerchandisingConfig,
  MerchandisingSource,
} from "../../ports/merchandising-source.js";

const merchandisingSchema = z.strictObject({
  topRatedProductIds: z
    .array(z.string().regex(/^[A-Za-z0-9_-]{1,64}$/u))
    .min(1)
    .refine((ids) => new Set(ids).size === ids.length),
  categoryFallbackCount: z.int().min(1).max(12),
});

export class JsonMerchandisingSource implements MerchandisingSource {
  private readonly config: MerchandisingConfig;

  constructor(
    path: string | URL,
    read = (file: string | URL) => readFileSync(file, "utf8"),
  ) {
    try {
      const data: unknown = JSON.parse(read(path));
      this.config = merchandisingSchema.parse(data);
    } catch {
      throw new Error("Invalid merchandising configuration");
    }
  }

  getConfig(): Promise<MerchandisingConfig> {
    return Promise.resolve({
      ...this.config,
      topRatedProductIds: [...this.config.topRatedProductIds],
    });
  }
}
