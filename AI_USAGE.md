# AI usage notes

## Tools and models

| Tool          | How I used it                                                                                                                |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Claude Opus   | Planning the catalogue, comparing architecture options, and turning the challenge into a phased implementation plan.         |
| Codex (GPT-6) | Developing the application and tests from the phase specifications, refining the UI, and verifying the build and submission. |

## Agent instructions and plan

[AGENTS.md](AGENTS.md) sets the coding, testing, architecture, and privacy rules. [CLAUDE.md](CLAUDE.md) points to the same working agreement. The [implementation plan](docs/PLAN.md) records the acceptance criteria, decisions, phase gates, and security controls. Each phase specification turns the planned behaviour into testable examples.

## Key prompts or moments

1. **Adopt spec-first TDD.** I asked whether the Phase 1 unit tests were written before implementation. I then asked for a spec and a failing test before each development task, for Phase 1 coverage to be checked, and for the change in approach to be recorded. [Development workflow](DECISIONS.md#development-workflow)
2. **Improve the storefront UI.** I asked for a more styled catalogue, clearer selections, and more animation. The UI gained a featured product, visible category selection, and entrance, hover, and navigation transitions that respect reduced motion. [UI decision](DECISIONS.md#user-interface)
3. **Verify security throughout the build.** I asked what the security pass actually checked. GitHub Actions runs a runtime dependency audit and a Git history secret scan on pushes and pull requests. The final review also checked the running preview's security headers and container settings and reran targeted tests for input validation, rate limiting, safe rendering, and log redaction. [Security controls](SECURITY.md)
4. **Audit the submission against the original brief and plan.** I asked Codex to compare the running application and submission with the original challenge PDF and `docs/PLAN.md`. The five feature flows were verified. The comparison also surfaced missing reviewer access and documentation still staged locally. The repository was made public, the reviewer docs were published, and the time and AI records were completed. [Implementation plan](docs/PLAN.md)

## Mistake log

| What happened                                                          | How it was caught                                                                   | Fix                                                                                                                                    | Commit    |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| The original Phase 1 code and tests were written alongside each other. | My question about whether tests came first prompted a check of the Phase 1 history. | Added the Phase 1 specification and additional coverage, and documented that future development starts with a spec and a failing test. | `9c68856` |
