# Phase 3 specification · Enquiry API

This specification applies [PLAN §8](PLAN.md#8-enquiry-and-email), [the API contract](PLAN.md#6-api-contract-v1), and [the request controls](PLAN.md#104-controls-checklist).

| ID    | Expected behavior                                                                                                                                                                                                     | Verification                                                               |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| P3-01 | The strict shared request contract accepts only the product ID and customer fields. It trims applicable values and applies the agreed field rules. An accepted response contains the generated enquiry UUID.          | Shared contract tests.                                                     |
| P3-02 | The service looks up the product, generates a reference, and submits a single email. A missing product returns 422 and a failed send returns 502. Logs contain the reference and product ID.                          | Service tests using a recording sender and a fixed clock.                  |
| P3-03 | SMTP delivers plain text to the configured inbox with the fixed From and the customer as Reply-To. The subject has a safe product title and short reference. The body uses the product and price from the repository. | Composition tests, a Nodemailer transport test, and a Mailpit smoke check. |
| P3-04 | The versioned POST endpoint accepts JSON only, applies the 10 KB limit and returns 202 after the relay accepts the message. The sixth enquiry from one IP within 10 minutes returns 429 with Retry-After.             | HTTP integration tests and a developer-mode smoke check.                   |

## First task · Shared enquiry contracts

- Require `productId`, `name` and `email`. Use the same opaque ID grammar as the catalogue. Trim the name and email, enforce the 100- and 254-character limits, and require a valid email address.
- Treat `phone` and `message` as optional. Trim both. Phone permits numbers, plus signs, parentheses, hyphens and spaces, up to 30 characters. Omit a blank phone. The optional message allows up to 2,000 characters after trimming.
- Reject extra fields including client-supplied price and title. Require a UUID in the response's `enquiryId` field and reject other response fields.
- Check accepted values at the length boundaries, rejected values above them, omitted required fields, malformed identifiers and email addresses, phone punctuation, and a blank phone.

## Remaining tasks · Acceptance examples

- A valid request for an existing product sends one message to the configured sales inbox and returns a reference only after the send resolves. A missing product sends no mail and returns 422. A rejected send returns 502. Service events contain the enquiry reference and product ID.
- For a fixed reference and time, the email includes the configured From and To, a safely quoted customer Reply-To, a single-line subject of at most 150 characters including the short reference, the ISO UTC time, the catalogue price in AUD, and the product link. Optional blank details display as `not provided`. The message has only a plain-text body.
- Requests with another media type return 415. Malformed or invalid JSON returns 400. A JSON body over 10 KB returns 413. The enquiry route applies the per-IP limit to JSON submissions before parsing the body. The sixth request within 10 minutes returns 429 with `Retry-After`.
- In developer mode, POST a sample enquiry through Vite, then confirm its reference, From, To, Reply-To, subject and body in Mailpit. Submit five enquiries from one IP, confirm the sixth is rejected, and check Mailpit received exactly five messages.
