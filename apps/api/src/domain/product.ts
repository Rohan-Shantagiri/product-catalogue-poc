export type ProductId = string;

export type Money = { amountCents: number; currency: string };
export type Category = { slug: string; name: string };
export type Rating = { average: number; count: number };

export type Product = {
  id: ProductId;
  title: string;
  description: string;
  price: Money;
  category: Category;
  imageSourceUrl: string;
  rating: Rating | null;
};
