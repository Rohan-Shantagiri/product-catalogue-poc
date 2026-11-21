// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { makeProductDto } from "../../../../test/factories";
import { renderCatalogue } from "../../../../test/render";
import {
  catalogueTestServer,
  endpoint,
  missingResource,
} from "../../../../test/server";

const server = catalogueTestServer();
const product = makeProductDto("SKU_A-2", {
  title: "Studio monitor",
  description: 'Use <img alt="Injected image" src="example"> as literal text.',
  imageUrl: "/api/v1/products/catalogue-photo/image",
});

describe("AC Product: details and safe image and text rendering", () => {
  it("shows price, rating, category, provided image and literal description", async () => {
    server.use(
      http.get(endpoint("/products/SKU_A-2"), () => HttpResponse.json(product)),
    );
    renderCatalogue("/products/SKU_A-2");
    expect(
      await screen.findByRole("heading", { level: 1, name: product.title }),
    ).toBeTruthy();
    expect(screen.getByText("$109.95")).toBeTruthy();
    expect(screen.getByText("4.7 out of 5 (500 reviews)")).toBeTruthy();
    expect(
      screen
        .getAllByRole("link", { name: "Electronics" })
        .at(-1)
        ?.getAttribute("href"),
    ).toBe("/category/electronics");
    expect(
      screen.getByRole("img", { name: product.title }).getAttribute("src"),
    ).toBe(product.imageUrl);
    expect(screen.getByText(product.description).textContent).toBe(
      product.description,
    );
    expect(screen.queryByRole("img", { name: "Injected image" })).toBeNull();
  });

  it("shows a missing-page message for an unknown product", async () => {
    server.use(http.get(endpoint("/products/unknown"), missingResource));
    renderCatalogue("/products/unknown");
    expect(
      await screen.findByRole("heading", { name: "Page not found" }),
    ).toBeTruthy();
  });
});
