import { Buffer } from "node:buffer";
import { categorySlugSchema, productIdSchema } from "@catalogue/contracts";
import { Router } from "@koa/router";
import type { RouterContext } from "@koa/router";
import { z } from "zod";
import { NotFoundError, ValidationError } from "../../domain/errors.js";
import type { CatalogueService } from "../../services/catalogue-service.js";
import type { RequestState } from "../middleware/request-context.js";
import {
  presentCategories,
  presentCategoryPage,
  presentProduct,
  presentProducts,
} from "../presenters.js";

const searchQuery = z.string().trim().min(1).max(100);
const catalogueCacheControl = "public, max-age=60";
const imageCacheControl = "public, max-age=86400";

function pathValue(schema: typeof productIdSchema, value: unknown): string {
  const result = schema.safeParse(value);
  if (!result.success) throw new NotFoundError();
  return result.data;
}

export function createCatalogueRouter(catalogue: CatalogueService) {
  const router = new Router<RequestState>();

  function get(
    path: string,
    handler: (ctx: RouterContext<RequestState>) => Promise<void>,
  ) {
    router.get(path, async (ctx) => {
      ctx.state.route = path;
      await handler(ctx);
    });
  }

  get("/api/v1/collections/:slug", async (ctx) => {
    if (ctx.params.slug !== "top-rated") throw new NotFoundError();
    ctx.body = presentProducts(await catalogue.getTopRated());
    ctx.set("Cache-Control", catalogueCacheControl);
  });

  get("/api/v1/categories", async (ctx) => {
    ctx.body = presentCategories(await catalogue.listCategories());
    ctx.set("Cache-Control", catalogueCacheControl);
  });

  get("/api/v1/categories/:slug/products", async (ctx) => {
    const slug = pathValue(categorySlugSchema, ctx.params.slug);
    ctx.body = presentCategoryPage(await catalogue.getCategoryPage(slug));
    ctx.set("Cache-Control", catalogueCacheControl);
  });

  get("/api/v1/products", async (ctx) => {
    const q = searchQuery.safeParse(ctx.query.q);
    if (!q.success)
      throw new ValidationError([
        { path: "q", message: "Enter 1 to 100 characters." },
      ]);
    ctx.body = presentProducts(await catalogue.search(q.data));
    ctx.set("Cache-Control", catalogueCacheControl);
  });

  get("/api/v1/products/:id", async (ctx) => {
    const id = pathValue(productIdSchema, ctx.params.id);
    ctx.body = presentProduct(await catalogue.getProduct(id));
    ctx.set("Cache-Control", catalogueCacheControl);
  });

  get("/api/v1/products/:id/image", async (ctx) => {
    const id = pathValue(productIdSchema, ctx.params.id);
    const image = await catalogue.getProductImage(id);
    ctx.body = Buffer.from(image.body);
    ctx.type = image.contentType;
    ctx.set("Cache-Control", imageCacheControl);
  });

  return router;
}
