# Security and privacy

## Scope and data

The PoC applies boundary validation, same-origin access, and secret handling to the catalogue and enquiry flows. Products, categories, and images are public. Curated IDs live in versioned configuration. Product data and rate-limit counters are held in API memory.

Name and email are required for an enquiry. Phone and message are optional. The API hands the enquiry to SMTP, and the message in the sales inbox is the record. The form explains why it collects the details. Use synthetic data with Mailpit, which is a local test inbox. Production requires limited access to the sales inbox and a retention policy for email and proxy logs. Proxy access logs can include client IP addresses.

## Threats and checks

| Risk                                            | Control and evidence                                                                                                                                                                                                                                                  |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Forged product details or injected mail headers | The strict shared Zod schema accepts a product ID and customer fields. The service builds the subject and product details from the catalogue, normalises line breaks, and uses a fixed From address. Enquiry tests cover request rejection and SMTP payloads.         |
| Untrusted upstream content                      | The Fake Store adapter validates rows. React renders descriptions as text. The image proxy checks the configured host, rejects redirects, and caps responses at 5 MiB. API and UI tests cover these boundaries.                                                       |
| Browser bypass of the API                       | nginx serves a same-origin API and sends CSP with `connect-src 'self'` and `img-src 'self' data:`. This makes the browser enforce TC2. nginx also sends `nosniff` and a referrer policy.                                                                              |
| Enquiry flooding and oversized requests         | The default limit is five attempts per client IP per ten minutes. A 429 carries `Retry-After`. The route accepts JSON and caps the body at 10 KB. Compose limits trusted proxy hops to one. The HTTP suite checks status codes, retry headers, and body size.         |
| Disclosure in errors or logs                    | Problem Details responses omit internals. Request IDs and enquiry references support correlation. Logger tests cover redaction, and request bodies and customer records stay out of structured logs.                                                                  |
| Excess privileges and exposed credentials       | API and web run as non-root with read-only root filesystems, dropped capabilities, and `no-new-privileges`. CI scans Git history with gitleaks and checks runtime dependencies with npm audit. Dependabot monitors dependencies, workflow actions, and Docker images. |

[`.env.example`](.env.example) contains placeholders. Git and Docker ignore local `.env` files. The smoke test uses fixture data and sends one synthetic message to the isolated Mailpit inbox.

## Production hardening

Terminate TLS and set HSTS at the edge. Replace Mailpit with a TLS-capable relay or an SES adapter with an IAM role. Use Secrets Manager for provider credentials where needed. Move shared rate limits to an edge WAF or Redis, add CAPTCHA when warranted, and set proxy and email log retention. Keep the API behind the trusted proxy.

## Report a vulnerability

Use **Security → Report a vulnerability** on the repository when private reporting is available. If the Security tab offers no private reporting option, contact the repository owner privately. Include the affected version and enough detail to reproduce the issue using synthetic data.
