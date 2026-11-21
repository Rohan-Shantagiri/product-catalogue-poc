# Phase 5 specification

This specification follows [PLAN §13](PLAN.md#13-testing-strategy) and [PLAN §16](PLAN.md#16-work-plan-phase-gated).

## Compose smoke check

| ID    | Acceptance criterion                                                                                                 | Verification                                                                         |
| ----- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| P5-01 | One command starts a dedicated Compose project in fixture mode and serves the web and the API on the published port. | Fetch the home HTML and `/api/health` through nginx. Check that health reports `ok`. |
| P5-02 | The top-rated route returns the five expected curated products in order.                                             | Check IDs `3, 5, 11, 12, 18` on `/api/v1/collections/top-rated`.                     |
| P5-03 | One synthetic enquiry returns 202 and appears once in the empty, local sales inbox.                                  | Check the acceptance ID and correlate its prefix with the sole Mailpit message.      |
| P5-04 | A failed check fails the command. The smoke stack comes down on success or failure.                                  | Run the checks before adding Compose orchestration. Then run the completed command.  |
| P5-05 | GitHub Actions runs the same command on branch pushes and pull requests into `main`.                                 | Review the workflow and run the smoke script against the local Docker stack.         |

The smoke stack uses an isolated Compose project and fixture products. It sends only to local Mailpit using synthetic enquiry details. The API, web, and Mailpit host ports can be overridden to avoid collisions with a running preview.

## Reviewer handoff

The README explains how to verify each acceptance criterion and links to the decision log and security controls. The fresh-clone drill builds and starts Compose with an empty checkout, then verifies the running application. The human writes the AI usage and time record and reviews the final changes before publication.
