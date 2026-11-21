// @vitest-environment jsdom
import { enquiryRequestSchema } from "@catalogue/contracts";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { makeProductDto } from "../../../../test/factories";
import { renderCatalogue } from "../../../../test/render";
import { catalogueTestServer, endpoint } from "../../../../test/server";

const server = catalogueTestServer();
const product = makeProductDto("3", { title: "Canvas jacket" });
const accepted = { enquiryId: "56aa30c8-2196-4e2f-bff6-600b6edfa03b" };

async function openForm() {
  server.use(
    http.get(endpoint("/products/3"), () => HttpResponse.json(product)),
  );
  renderCatalogue("/products/3");
  const toggle = await screen.findByRole("button", {
    name: "Enquire about this product",
  });
  expect(toggle.getAttribute("aria-expanded")).toBe("false");
  fireEvent.click(toggle);
  expect(toggle.getAttribute("aria-expanded")).toBe("true");
  await waitFor(() =>
    expect(document.activeElement).toBe(
      screen.getByRole("textbox", { name: "Full name" }),
    ),
  );
}

function fillForm() {
  fireEvent.change(screen.getByRole("textbox", { name: "Full name" }), {
    target: { value: "Example Customer" },
  });
  fireEvent.change(screen.getByRole("textbox", { name: "Email" }), {
    target: { value: "customer@example.com" },
  });
}

function problem(
  status: number,
  code: string,
  options: {
    errors?: { path: string; message: string }[];
    retryAfter?: string;
  } = {},
) {
  return HttpResponse.json(
    {
      type: "about:blank",
      title: "Request failed",
      status,
      code,
      errors: options.errors,
    },
    {
      status,
      headers: {
        "content-type": "application/problem+json",
        ...(options.retryAfter ? { "Retry-After": options.retryAfter } : {}),
      },
    },
  );
}

describe("AC Enquiry: inline form and delivery feedback", () => {
  it("focuses the form, prevents duplicate sends while pending and focuses the thank-you", async () => {
    let release = () => {};
    const gateway = new Promise<void>((resolve) => {
      release = () => resolve();
    });
    const send = vi.fn();
    server.use(
      http.post(endpoint("/enquiries"), async ({ request }) => {
        send(enquiryRequestSchema.parse(await request.json()));
        await gateway;
        return HttpResponse.json(accepted, { status: 202 });
      }),
    );
    await openForm();
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: "Send enquiry" }));
    const pending = await screen.findByRole<HTMLButtonElement>("button", {
      name: "Sending…",
    });
    expect(pending.disabled).toBe(true);
    fireEvent.click(pending);
    await waitFor(() =>
      expect(send).toHaveBeenCalledExactlyOnceWith({
        productId: "3",
        name: "Example Customer",
        email: "customer@example.com",
        message: "",
      }),
    );
    release();
    const thanks = await screen.findByRole("status");
    expect(thanks.textContent).toContain("Thank you, Example Customer!");
    expect(thanks.textContent).toContain("Canvas jacket");
    expect(thanks.textContent).toContain("customer@example.com");
    expect(document.activeElement).toBe(thanks);
  });

  it("marks invalid fields and focuses the first one", async () => {
    await openForm();
    fireEvent.click(screen.getByRole("button", { name: "Send enquiry" }));
    const name = screen.getByRole("textbox", { name: "Full name" });
    await waitFor(() => expect(name.getAttribute("aria-invalid")).toBe("true"));
    expect(name.getAttribute("aria-describedby")).toBeTruthy();
    expect(document.activeElement).toBe(name);
  });

  it("maps server field errors and keeps the entered values", async () => {
    server.use(
      http.post(endpoint("/enquiries"), () =>
        problem(400, "VALIDATION_FAILED", {
          errors: [{ path: "email", message: "Use a different address." }],
        }),
      ),
    );
    await openForm();
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: "Send enquiry" }));
    expect(await screen.findByText("Use a different address.")).toBeTruthy();
    const email = screen.getByRole<HTMLInputElement>("textbox", {
      name: "Email",
    });
    expect(email.value).toBe("customer@example.com");
    expect(email.getAttribute("aria-invalid")).toBe("true");
  });

  it.each([
    [422, "PRODUCT_NOT_FOUND", "This product is no longer available."],
    [429, "RATE_LIMITED", "Too many enquiries. Please try again in 2 minutes."],
    [
      502,
      "EMAIL_DELIVERY_FAILED",
      "We couldn't send your enquiry. Please try again.",
    ],
  ] as const)(
    "shows a recoverable message for %s",
    async (status, code, message) => {
      server.use(
        http.post(endpoint("/enquiries"), () =>
          problem(status, code, {
            retryAfter: status === 429 ? "120" : undefined,
          }),
        ),
      );
      await openForm();
      fillForm();
      fireEvent.click(screen.getByRole("button", { name: "Send enquiry" }));
      expect((await screen.findByRole("alert")).textContent).toBe(message);
      expect(
        screen.getByRole<HTMLInputElement>("textbox", { name: "Full name" })
          .value,
      ).toBe("Example Customer");
    },
  );
});
