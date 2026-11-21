import { describe, expect, it } from "vitest";
import {
  enquiryAcceptedResponseSchema,
  enquiryRequestSchema,
} from "./index.js";

const required = {
  productId: "SKU_A-2",
  name: "Example Customer",
  email: "customer@example.com",
};

function emailWithTailLength(tailLength: number) {
  return `${"a".repeat(64)}@${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(tailLength)}.com`;
}

describe("P3-01: strict shared enquiry request", () => {
  it("accepts the required fields and trims optional customer details", () => {
    expect(enquiryRequestSchema.parse(required)).toStrictEqual(required);
    expect(
      enquiryRequestSchema.parse({
        productId: required.productId,
        name: "  Example Customer  ",
        email: "  customer@example.com  ",
        phone: "  +61 (02) 1234-5678  ",
        message: "  Is this item available?  ",
      }),
    ).toStrictEqual({
      ...required,
      phone: "+61 (02) 1234-5678",
      message: "Is this item available?",
    });
  });

  it("omits a blank phone", () => {
    expect(
      enquiryRequestSchema.parse({ ...required, phone: "  " }),
    ).toStrictEqual(required);
  });

  it("accepts the exact field-length limits after trimming", () => {
    const max = {
      productId: "a".repeat(64),
      name: "a".repeat(100),
      email: emailWithTailLength(57),
      phone: "1".repeat(30),
      message: "a".repeat(2000),
    };
    expect(max.email).toHaveLength(254);
    expect(
      enquiryRequestSchema.parse({ ...max, name: ` ${max.name} ` }),
    ).toStrictEqual(max);
  });

  it.each(["productId", "name", "email"] as const)(
    "rejects a missing %s",
    (field) => {
      const input: Partial<typeof required> = { ...required };
      delete input[field];
      expect(enquiryRequestSchema.safeParse(input).success).toBe(false);
    },
  );

  it.each([
    ["a numeric ID", { productId: 3 }],
    ["a malformed ID", { productId: "store/3" }],
    ["an overlong ID", { productId: "a".repeat(65) }],
    ["a blank name", { name: " " }],
    ["an overlong name", { name: "a".repeat(101) }],
    ["an invalid email", { email: "customer.example.com" }],
    ["an overlong email", { email: emailWithTailLength(58) }],
    ["an invalid phone character", { phone: "1234 ext 56" }],
    ["an overlong phone", { phone: "1".repeat(31) }],
    ["an overlong message", { message: "a".repeat(2001) }],
    ["a client-supplied price", { price: 1 }],
    ["a client-supplied product title", { title: "Different product" }],
  ])("rejects %s", (_label, invalid) => {
    expect(
      enquiryRequestSchema.safeParse({ ...required, ...invalid }).success,
    ).toBe(false);
  });
});

describe("P3-01: shared accepted enquiry response", () => {
  it("accepts only the enquiry UUID", () => {
    const result = { enquiryId: "56aa30c8-2196-4e2f-bff6-600b6edfa03b" };
    expect(enquiryAcceptedResponseSchema.parse(result)).toEqual(result);
    expect(
      enquiryAcceptedResponseSchema.safeParse({ enquiryId: "not-a-uuid" })
        .success,
    ).toBe(false);
    expect(
      enquiryAcceptedResponseSchema.safeParse({ ...result, status: "accepted" })
        .success,
    ).toBe(false);
    expect(enquiryAcceptedResponseSchema.safeParse({}).success).toBe(false);
  });
});
