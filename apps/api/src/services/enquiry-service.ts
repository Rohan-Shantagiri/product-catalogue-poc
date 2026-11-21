import type { Enquiry } from "../domain/enquiry.js";
import { EmailDeliveryError, ProductNotFoundError } from "../domain/errors.js";
import type { ProductId } from "../domain/product.js";
import type { Clock } from "../ports/clock.js";
import type { EmailSender } from "../ports/email-sender.js";
import type { ProductRepository } from "../ports/product-repository.js";
import { composeEnquiryEmail } from "./enquiry-email.js";
import type { EnquiryEmailConfig } from "./enquiry-email.js";

type EnquiryEvent = {
  type: "enquiry.accepted" | "enquiry.failed";
  enquiryId: string;
  productId: ProductId;
};

type EnquiryDependencies = {
  products: Pick<ProductRepository, "getById">;
  emails: EmailSender;
  emailConfig: EnquiryEmailConfig;
  clock: Clock;
  createId: () => string;
  report: (event: EnquiryEvent) => void;
};

export class EnquiryService {
  constructor(private readonly deps: EnquiryDependencies) {}

  async submit({
    productId,
    ...customer
  }: Enquiry["customer"] & { productId: ProductId }) {
    const product = await this.deps.products.getById(productId);
    if (!product) throw new ProductNotFoundError();

    const enquiryId = this.deps.createId();
    const enquiry: Enquiry = {
      id: enquiryId,
      receivedAt: this.deps.clock(),
      product,
      customer,
    };
    const message = composeEnquiryEmail(enquiry, this.deps.emailConfig);

    try {
      await this.deps.emails.send(message);
    } catch {
      this.deps.report({ type: "enquiry.failed", enquiryId, productId });
      throw new EmailDeliveryError();
    }

    this.deps.report({ type: "enquiry.accepted", enquiryId, productId });
    return { enquiryId };
  }
}
