import { z } from "zod";

export const productIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);
export const categorySlugSchema = z.string().regex(/^[a-z0-9-]{1,64}$/);

export const moneyDtoSchema = z.strictObject({
  amountCents: z.int().nonnegative(),
  currency: z.string().regex(/^[A-Z]{3}$/),
});

export const categoryDtoSchema = z.strictObject({
  slug: categorySlugSchema,
  name: z.string().min(1),
});

export const ratingDtoSchema = z.strictObject({
  average: z.number().min(0).max(5),
  count: z.int().nonnegative(),
});

export const productDtoSchema = z.strictObject({
  id: productIdSchema,
  title: z.string().min(1),
  description: z.string(),
  price: moneyDtoSchema,
  category: categoryDtoSchema,
  imageUrl: z
    .string()
    .regex(/^\/api\/v1\/products\/[A-Za-z0-9_-]{1,64}\/image$/),
  rating: ratingDtoSchema.nullable(),
});

export const productListResponseSchema = z.strictObject({
  items: z.array(productDtoSchema),
});

export const categoryListResponseSchema = z.strictObject({
  items: z.array(categoryDtoSchema),
});

export const categoryProductsResponseSchema = z.strictObject({
  category: categoryDtoSchema,
  topRated: z.array(productDtoSchema),
  others: z.array(productDtoSchema),
});

export type MoneyDto = z.infer<typeof moneyDtoSchema>;
export type CategoryDto = z.infer<typeof categoryDtoSchema>;
export type RatingDto = z.infer<typeof ratingDtoSchema>;
export type ProductDto = z.infer<typeof productDtoSchema>;
export type ListResponse<T> = { items: T[] };
export type CategoryProductsResponse = z.infer<
  typeof categoryProductsResponseSchema
>;
