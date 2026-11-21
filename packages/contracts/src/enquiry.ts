import { z } from "zod";
import { productIdSchema } from "./product.js";

const enquiryFields = z.strictObject({
  productId: productIdSchema,
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().max(254).pipe(z.email()),
  phone: z
    .string()
    .trim()
    .max(30)
    .regex(/^[0-9+()\- ]*$/)
    .optional(),
  message: z.string().trim().max(2000).optional(),
});

export const enquiryFormSchema = enquiryFields.omit({ productId: true });
export type EnquiryFormValues = z.infer<typeof enquiryFormSchema>;

export const enquiryRequestSchema = enquiryFields.transform(
  ({ phone, ...request }): z.output<typeof enquiryFields> =>
    phone ? { ...request, phone } : request,
);

export const enquiryAcceptedResponseSchema = z.strictObject({
  enquiryId: z.uuid(),
});

export type EnquiryRequest = z.infer<typeof enquiryRequestSchema>;
export type EnquiryAcceptedResponse = z.infer<
  typeof enquiryAcceptedResponseSchema
>;
