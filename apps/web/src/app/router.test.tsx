// @vitest-environment jsdom
import { fireEvent, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { renderCatalogue } from "../../test/render";
import { catalogueTestServer, endpoint } from "../../test/server";
import { appRoutes } from "./router";

const server = catalogueTestServer();

describe("P4-01: frontend shell and navigation", () => {
  it("provides accessible landmarks, a skip target and a page title", async () => {
    server.use(
      http.get(endpoint("/collections/top-rated"), () =>
        HttpResponse.json({ items: [] }),
      ),
    );
    renderCatalogue("/");
    expect(screen.getByRole("banner")).toBeTruthy();
    expect(screen.getByRole("contentinfo")).toBeTruthy();
    const main = screen.getByRole("main");
    expect(main.tabIndex).toBe(-1);
    expect(
      screen
        .getByRole("link", { name: "Skip to main content" })
        .getAttribute("href"),
    ).toBe(`#${main.id}`);
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Find your next favourite",
      }),
    ).toBeTruthy();
    expect(
      await screen.findByRole("region", { name: "Top rated" }),
    ).toBeTruthy();
    expect(document.title).toBe("Product catalogue | Catalogue");
  });

  it("handles an unknown URL and returns home using the recovery link", async () => {
    server.use(
      http.get(endpoint("/collections/top-rated"), () =>
        HttpResponse.json({ items: [] }),
      ),
    );
    renderCatalogue("/missing-page");
    expect(
      screen.getByRole("heading", { name: "Page not found" }),
    ).toBeTruthy();
    expect(document.title).toBe("Page not found | Catalogue");
    fireEvent.click(screen.getByRole("link", { name: "Back to catalogue" }));
    expect(
      await screen.findByRole("heading", { name: "Find your next favourite" }),
    ).toBeTruthy();
    expect(
      await screen.findByRole("region", { name: "Top rated" }),
    ).toBeTruthy();
  });

  it("offers a generic recovery page when a route throws", async () => {
    const root = appRoutes[0];
    if (!root || root.index) throw new Error("Expected a layout route");
    renderCatalogue("/broken", [
      {
        ...root,
        children: [
          {
            path: "broken",
            loader: () => {
              throw new Error("Internal route details");
            },
            hydrateFallbackElement: null,
          },
        ],
      },
    ]);

    expect(
      await screen.findByRole("heading", { name: "This page is unavailable" }),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "Back to catalogue" })
        .getAttribute("href"),
    ).toBe("/");
    expect(screen.queryByText("Internal route details")).toBeNull();
  });
});
