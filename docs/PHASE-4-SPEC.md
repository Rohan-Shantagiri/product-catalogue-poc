# Phase 4 specification · Catalogue frontend

This specification follows [PLAN §9](PLAN.md#9-frontend-spec) and the [Phase 4 work plan](PLAN.md#16-work-plan-phase-gated). The API owns search and curation. The browser sends every catalogue request through the same-origin API.

| ID    | Expected behavior                                                                                                                                                                                                                                             | Verification                                                  |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| P4-01 | The shared application shell provides landmarks, a keyboard skip link, a brand home link, and route-level error handling. React Router owns navigation and TanStack Query owns remote state. The shared client validates API responses and normalises errors. | Shell, client and provider tests.                             |
| P4-02 | Home shows the five curated products in server order. Category pages show separate top-rated and other products. The product detail page shows catalogue data and uses the backend-provided image URL.                                                        | Role-based component and page tests with API fixtures.        |
| P4-03 | Search keeps the query in the URL, uses the API's result ordering, and shows prompt, loading, empty, and error states.                                                                                                                                        | Search tests covering submit, back navigation and no results. |
| P4-04 | Enquiry opens inline, focuses and validates fields, sends one request while pending, and shows the accepted state. Server errors keep values and handle validation, missing product, rate limit and unavailable service.                                      | Form and enquiry tests with stubbed API responses.            |
| P4-05 | The site works on a 375px screen and with keyboard navigation. Components use shared tokens, accessible controls and visible focus.                                                                                                                           | Browser checks in the phase acceptance pass.                  |

## First task · Frontend foundation

- The initial home route continues showing the API liveness status. Its common shell provides a banner, main region and footer. The skip link targets a focusable main region, and the Catalogue link returns home.
- Unknown paths show a recovery link. Unexpected route failures show a generic message with a link home. Each page declares a document title.
- The shared client sends versioned requests under `/api/v1`, validates successful JSON with the supplied schema, and gives the caller typed failures. It preserves problem status, code, title, field errors, request ID and numeric Retry-After. Transport failures are `NETWORK_ERROR` with status 0. Invalid or non-JSON responses report a generic message.
- Queries stay fresh for one minute and avoid refetch on focus. The client retries transport failures and 5xx at most twice and skips retries for 4xx and mutations.
- Use root CSS tokens for palette, type, spacing, radii and focus treatment. Keep customer catalogue screens and controls in their own later tasks.

## Browsing task · Home, categories, and product details

- The home page replaces the health screen with a catalogue heading and a `Top rated` section. It requests the curated list and keeps the API's order. A gallery card opens the product route through one accessible link.
- The header shows the categories from the API in their supplied order. The current category link is active. The category page displays the two API product groups without mixing them and omits the other-products section when empty.
- The product page shows its title, localised price, rating and review count when present, category link, description as plain text, and the exact image URL in the response. Images fall back to the local SVG when loading fails.
- The home, category and detail routes provide visible loading and recoverable error states. Category and product 404 responses show the missing-page view. The enquiry form and search remain separate tasks.

## Visual polish · Motion and category selection

- The home page highlights the first curated product using its API-provided image. Its product link opens the detail page, and the primary browse link moves to the top-rated gallery.
- The navigation includes a Featured selection for the home page. Featured or the current category has the selected treatment and `aria-current="page"`. Choices remain keyboard accessible at 375px.
- Product cards, the featured panel and category selections use brief transitions or entrance animations. The layout and active states remain usable with reduced motion, and smooth scrolling is disabled for that preference.

### Navigation motion

- Selecting a category, opening a product, or returning to Featured requests a native view transition where supported. The main content slides and cross-fades briefly while the header stays in place.
- Product cards show a directional cue on hover and keyboard focus. Reduced-motion mode keeps that cue visible without movement and removes the route animation. Links continue to work in browsers without the native transition API.
