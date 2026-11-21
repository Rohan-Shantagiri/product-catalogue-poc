// @vitest-environment jsdom
import { fireEvent, screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { electronics, makeProductDto } from "../../../../test/factories";
import { renderCatalogue } from "../../../../test/render";
import {
  catalogueTestServer,
  endpoint,
  missingResource,
} from "../../../../test/server";

const server = catalogueTestServer();
const categoryPath = "/categories/electronics/products";
const topRated = [
  makeProductDto("11", { title: "Drive" }),
  makeProductDto("12", { title: "Portable disk" }),
];
const others = [makeProductDto("9", { title: "USB device" })];

describe("AC Category: category navigation and distinct product groups", () => {
  it("opens an active category and keeps its curated and remaining products separate", async () => {
    server.use(
      http.get(endpoint("/collections/top-rated"), () =>
        HttpResponse.json({ items: [] }),
      ),
      http.get(endpoint(categoryPath), () =>
        HttpResponse.json({ category: electronics, topRated, others }),
      ),
    );
    renderCatalogue("/");
    const nav = await screen.findByRole("navigation", { name: "Categories" });
    expect(
      within(nav)
        .getByRole("link", { name: "Featured" })
        .getAttribute("aria-current"),
    ).toBe("page");

    fireEvent.click(
      await within(nav).findByRole("link", { name: "Electronics" }),
    );
    expect(
      await screen.findByRole("heading", { level: 1, name: "Electronics" }),
    ).toBeTruthy();
    expect(
      within(nav)
        .getByRole("link", { name: "Electronics" })
        .getAttribute("aria-current"),
    ).toBe("page");
    const featured = screen.getByRole("region", { name: "Top rated" });
    const remaining = screen.getByRole("region", {
      name: "More in Electronics",
    });
    expect(
      within(featured)
        .getAllByRole("link")
        .map((link) => link.getAttribute("href")),
    ).toEqual(["/products/11", "/products/12"]);
    expect(
      within(remaining)
        .getAllByRole("link")
        .map((link) => link.getAttribute("href")),
    ).toEqual(["/products/9"]);
  });

  it("uses a view transition when selecting a category and then a product", async () => {
    server.use(
      http.get(endpoint("/collections/top-rated"), () =>
        HttpResponse.json({ items: [] }),
      ),
      http.get(endpoint(categoryPath), () =>
        HttpResponse.json({ category: electronics, topRated, others }),
      ),
      http.get(endpoint("/products/11"), () => HttpResponse.json(topRated[0])),
    );
    const existing = Object.getOwnPropertyDescriptor(
      document,
      "startViewTransition",
    );
    const start = vi.fn((update: () => Promise<void>) => {
      const finished = Promise.resolve().then(update);
      return {
        ready: finished,
        finished,
        updateCallbackDone: finished,
        skipTransition: vi.fn(),
      };
    });
    Object.defineProperty(document, "startViewTransition", {
      configurable: true,
      value: start,
    });

    try {
      renderCatalogue("/");
      fireEvent.click(await screen.findByRole("link", { name: "Electronics" }));
      await screen.findByRole("heading", { level: 1, name: "Electronics" });
      const featured = await screen.findByRole("region", { name: "Top rated" });
      fireEvent.click(within(featured).getByRole("link", { name: "Drive" }));
      expect(
        await screen.findByRole("heading", { level: 1, name: "Drive" }),
      ).toBeTruthy();
      expect(start).toHaveBeenCalledTimes(2);
    } finally {
      if (existing)
        Object.defineProperty(document, "startViewTransition", existing);
      else Reflect.deleteProperty(document, "startViewTransition");
    }
  });

  it("omits the other-products section when it is empty", async () => {
    server.use(
      http.get(endpoint(categoryPath), () =>
        HttpResponse.json({ category: electronics, topRated, others: [] }),
      ),
    );
    renderCatalogue("/category/electronics");
    expect(
      await screen.findByRole("region", { name: "Top rated" }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("region", { name: "More in Electronics" }),
    ).toBeNull();
  });

  it("shows a missing-page message for an unknown category", async () => {
    server.use(
      http.get(endpoint("/categories/missing/products"), missingResource),
    );
    renderCatalogue("/category/missing");
    expect(
      await screen.findByRole("heading", { name: "Page not found" }),
    ).toBeTruthy();
  });
});
