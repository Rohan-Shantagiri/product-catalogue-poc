import type { Product } from "./product.js";

export type Enquiry = {
  id: string;
  receivedAt: Date;
  product: Product;
  customer: {
    name: string;
    email: string;
    phone?: string;
    message?: string;
  };
};
