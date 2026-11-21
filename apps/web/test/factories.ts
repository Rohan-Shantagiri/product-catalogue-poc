import type { CategoryDto, ProductDto } from "@catalogue/contracts";

export const electronics: CategoryDto = {
  slug: "electronics",
  name: "Electronics",
};
export const mensClothing: CategoryDto = {
  slug: "mens-clothing",
  name: "Men's Clothing",
};

export function makeProductDto(
  id: string,
  values: Partial<ProductDto> = {},
): ProductDto {
  return {
    id,
    title: `Product ${id}`,
    description: "A useful catalogue item.",
    price: { amountCents: 10995, currency: "AUD" },
    category: electronics,
    imageUrl: `/api/v1/products/${id}/image`,
    rating: { average: 4.7, count: 500 },
    ...values,
  };
}
