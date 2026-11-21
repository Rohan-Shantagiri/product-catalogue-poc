// @vitest-environment jsdom
import { fireEvent, screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { makeProductDto } from "../../../../test/factories";
import { renderCatalogue } from "../../../../test/render";
import { catalogueTestServer, endpoint } from "../../../../test/server";

const server = catalogueTestServer();
const items = [
  makeProductDto("3", {
    title: "Canvas jacket",
    imageUrl: "/api/v1/products/img-003/image",
  }),
  makeProductDto("5", { title: "Silver bracelet" }),
  makeProductDto("11", { title: "Solid-state drive" }),
  makeProductDto("12", { title: "Portable hard drive" }),
  makeProductDto("18", { title: "Cotton tee" }),
];

describe("AC Home: curated browsing and product cards", () => {
  it("renders the five curated items in API order and opens product details", async () => {
    server.use(
      http.get(endpoint("/collections/top-rated"), () =>
        HttpResponse.json({ items }),
      ),
      http.get(endpoint("/products/3"), () => HttpResponse.json(items[0])),
    );
    renderCatalogue("/");
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Find your next favourite",
      }),
    ).toBeTruthy();
    const section = await screen.findByRole("region", { name: "Top rated" });
    const links = await within(section).findAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual(
      items.map(({ id }) => `/products/${id}`),
    );
    const jacket = within(section).getByRole("link", { name: "Canvas jacket" });
    expect(
      within(jacket)
        .getByRole("img", { name: "Canvas jacket" })
        .getAttribute("src"),
    ).toBe("/api/v1/products/img-003/image");
    fireEvent.click(jacket);
    expect(
      await screen.findByRole("heading", { level: 1, name: "Canvas jacket" }),
    ).toBeTruthy();
  });

  it("offers a featured product and a direct link to the top-rated section", async () => {
    server.use(
      http.get(endpoint("/collections/top-rated"), () =>
        HttpResponse.json({ items }),
      ),
    );
    renderCatalogue("/");

    const featured = await screen.findByRole("link", {
      name: "View Canvas jacket",
    });
    expect(featured.getAttribute("href")).toBe("/products/3");
    expect(within(featured).getByText("$109.95")).toBeTruthy();
    const gallery = await screen.findByRole("region", { name: "Top rated" });
    expect(gallery.id).toBe("top-rated");
    expect(
      screen
        .getByRole("link", { name: "Browse top rated" })
        .getAttribute("href"),
    ).toBe("#top-rated");
  });

  it("uses a bundled fallback for a failed product image", async () => {
    server.use(
      http.get(endpoint("/collections/top-rated"), () =>
        HttpResponse.json({ items }),
      ),
    );
    renderCatalogue("/");
    const image = await screen.findByRole("img", { name: "Canvas jacket" });
    fireEvent.error(image);
    expect(image.getAttribute("src")).toBe("/placeholder.svg");
  });

  it("lets a user retry a failed catalogue load", async () => {
    server.use(
      http.get(endpoint("/collections/top-rated"), () => HttpResponse.error()),
    );
    renderCatalogue("/");
    expect(await screen.findByRole("alert")).toBeTruthy();
    server.use(
      http.get(endpoint("/collections/top-rated"), () =>
        HttpResponse.json({ items }),
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(
      await screen.findByRole("link", { name: "Canvas jacket" }),
    ).toBeTruthy();
  });
});
