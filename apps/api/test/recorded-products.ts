import { readFileSync } from "node:fs";

export function recordedProducts(): string {
  return readFileSync(
    new URL("../fixtures/fakestore-products.json", import.meta.url),
    "utf8",
  );
}

export const upstreamProduct = {
  id: 3,
  title: "Canvas jacket",
  price: 109.95,
  description: "A jacket for cool weather.",
  category: "men's clothing",
  image: "https://images.example.com/jacket.png",
  rating: { rate: 4.8, count: 3 },
};
