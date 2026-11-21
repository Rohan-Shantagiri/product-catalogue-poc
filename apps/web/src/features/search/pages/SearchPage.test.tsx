// @vitest-environment jsdom
import { act, fireEvent, screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { makeProductDto } from "../../../../test/factories";
import { renderCatalogue } from "../../../../test/render";
import { catalogueTestServer, endpoint } from "../../../../test/server";

const server = catalogueTestServer();

describe("AC Search: URL-driven catalogue search", () => {
  it("trims the input, sends the query and shows server order, then restores home on Back", async () => {
    const queries: string[] = [];
    server.use(
      http.get(endpoint("/collections/top-rated"), () =>
        HttpResponse.json({ items: [] }),
      ),
      http.get(endpoint("/products"), ({ request }) => {
        queries.push(new URL(request.url).searchParams.get("q") ?? "");
        return HttpResponse.json({
          items: [
            makeProductDto("3", { title: "Canvas jacket" }),
            makeProductDto("4", { title: "Warm jacket" }),
          ],
        });
      }),
    );
    const { router } = renderCatalogue("/");
    fireEvent.change(
      screen.getByRole("searchbox", { name: "Search products" }),
      { target: { value: "  jackets  " } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: 'Results for "jackets"',
      }),
    ).toBeTruthy();
    const result = await screen.findByRole("region", { name: "Products" });
    expect(
      within(result)
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual(["Canvas jacket", "Warm jacket"]);
    expect(queries).toEqual(["jackets"]);
    expect(router.state.location.search).toBe("?q=jackets");
    expect(
      screen.getByRole<HTMLInputElement>("searchbox", {
        name: "Search products",
      }).value,
    ).toBe("jackets");
    await act(async () => {
      await router.navigate(-1);
    });
    expect(
      screen.getByRole("heading", { name: "Find your next favourite" }),
    ).toBeTruthy();
    expect(
      screen.getByRole<HTMLInputElement>("searchbox", {
        name: "Search products",
      }).value,
    ).toBe("");
  });

  it("prompts for a query when none is supplied and shows empty results for a direct link", async () => {
    server.use(
      http.get(endpoint("/products"), () => HttpResponse.json({ items: [] })),
    );
    renderCatalogue("/search?q= ");
    expect(
      screen.getByText("Enter a product name or keyword to search."),
    ).toBeTruthy();
    fireEvent.change(
      screen.getByRole("searchbox", { name: "Search products" }),
      { target: { value: "no match" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(
      await screen.findByText('No products match "no match".'),
    ).toBeTruthy();
  });
});
