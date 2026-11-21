import { randomUUID } from "node:crypto";
import type { Logger } from "pino";
import { SmtpEmailSender } from "./adapters/email/smtp-email-sender.js";

import { HttpImageFetcher } from "./adapters/images/http-image-fetcher.js";
import { PlaceholderImageFetcher } from "./adapters/images/placeholder-image-fetcher.js";
import { JsonMerchandisingSource } from "./adapters/merchandising/json-merchandising-source.js";
import { CachedProductLoader } from "./adapters/products/cached-loader.js";
import { FakeStoreClient } from "./adapters/products/fakestore/fakestore-client.js";
import { loadFixtureProducts } from "./adapters/products/fixture/fixture-loader.js";
import { InMemoryProductRepository } from "./adapters/products/in-memory-product-repository.js";
import { loadEnv } from "./config/env.js";
import type { Product } from "./domain/product.js";
import { createApp } from "./http/app.js";
import { createLogger } from "./logger.js";
import type { ImageFetcher } from "./ports/image-fetcher.js";
import { CatalogueService } from "./services/catalogue-service.js";

import type { EmailSender } from "./ports/email-sender.js";
import { EnquiryService } from "./services/enquiry-service.js";

type ApiOptions = {
  request?: typeof globalThis.fetch;
  logger?: Logger;
  emailSender?: EmailSender;
};

export function composeApi(input: NodeJS.ProcessEnv, options: ApiOptions = {}) {
  const env = loadEnv(input);
  const logger = options.logger ?? createLogger(env.LOG_LEVEL);
  const onInvalid = (index: number) => {
    logger.warn({ event: "catalogue.invalid_item", index });
  };

  let loadProducts: () => Promise<Product[]>;
  let imageFetcher: ImageFetcher;
  if (env.PRODUCT_SOURCE === "fixture") {
    loadProducts = () => loadFixtureProducts(env.CATALOGUE_CURRENCY, onInvalid);
    imageFetcher = new PlaceholderImageFetcher();
  } else {
    const client = new FakeStoreClient({
      baseUrl: env.FAKESTORE_BASE_URL,
      currency: env.CATALOGUE_CURRENCY,
      timeoutMs: env.UPSTREAM_TIMEOUT_MS,
      request: options.request,
      onInvalid,
    });
    loadProducts = () => client.loadProducts();
    imageFetcher = new HttpImageFetcher(
      env.IMAGE_ALLOWED_HOSTS,
      env.UPSTREAM_TIMEOUT_MS,
      options.request,
    );
  }

  const loader = new CachedProductLoader(
    loadProducts,
    env.PRODUCT_SOURCE === "fixture"
      ? Infinity
      : env.CATALOGUE_CACHE_TTL_SECONDS * 1000,
    Date.now,
    () => {
      logger.warn({ event: "catalogue.stale_served" });
    },
  );
  const products = new InMemoryProductRepository(loader.load);
  const catalogue = new CatalogueService(
    products,
    new JsonMerchandisingSource(env.MERCHANDISING_FILE),
    imageFetcher,
    (event) => {
      if (event.type === "merchandising.unknown_id") {
        logger.warn({ event: event.type, id: event.id });
      } else {
        logger.info({ event: event.type, slug: event.slug });
      }
    },
  );
  const enquiries = new EnquiryService({
    products,
    emails:
      options.emailSender ??
      SmtpEmailSender.fromConfig({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        user: env.SMTP_USER,
        password: env.SMTP_PASS,
      }),
    emailConfig: {
      to: env.SALES_INBOX_EMAIL,
      from: env.ENQUIRY_FROM_EMAIL,
      webBaseUrl: env.PUBLIC_WEB_URL,
    },
    clock: () => new Date(),
    createId: randomUUID,
    report: ({ type, enquiryId, productId }) => {
      const event = { event: type, enquiryId, productId };
      if (type === "enquiry.failed") logger.warn(event);
      else logger.info(event);
    },
  });
  const app = createApp({
    logger,
    trustProxy: env.TRUST_PROXY,
    catalogue,
    enquiries,
    enquiryLimits: {
      max: env.ENQUIRY_RATE_LIMIT_MAX,
      windowSeconds: env.ENQUIRY_RATE_LIMIT_WINDOW_SECONDS,
    },
  });

  logger.info({
    event: "catalogue.source_selected",
    source: env.PRODUCT_SOURCE,
  });
  return { app, env, logger };
}
