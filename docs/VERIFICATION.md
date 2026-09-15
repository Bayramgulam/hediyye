# Verification record

Local environment: Windows x64, Node.js 24.19.0, Next.js 16.3.5, Prisma 6.19.3, actual PostgreSQL 18.4 via the packaged local-development fallback. Docker Desktop was installed but its engine did not respond; the Docker image/Compose deployment was not executed.

## Passed

- Strict TypeScript checking.
- ESLint with no remaining warnings/errors.
- 16 Vitest domain/database tests: authoritative pricing despite tampered totals; capacity, compatibility, stock and duplicate selections; Azerbaijani phone normalization; Baku cutoff/disabled dates; pickup versus delivery transitions; simultaneous idempotent requests; immutable historical snapshots; exactly-once stock release; final-unit and final-slot contention; payment deduplication/audit; cleanup racing with confirmation; invalid delivery date rejection.
- Full migration chain applied to a newly created isolated PostgreSQL database; nonnegative product, slot-capacity and gift-box foreign-key constraints verified. The temporary database was dropped afterward.
- Three Playwright scenarios: full five-step builder → persisted cart after refresh → guest checkout → database order → OWNER sign-in → fulfillment update → private tracking; responsive layout checks; stock/form validation, CSRF origin rejection, unauthenticated and STAFF write restrictions, invalid tracking token handling.
- Responsive screenshots generated for homepage, builder, checkout and admin at 360, 390, 768, 1024 and 1440 pixels. The responsive test waits for the page heading and removal of the loading state before measuring overflow/capturing. OWNER authentication is used for admin captures. Reduced motion is exercised in these captures.
- Production build generated the application routes successfully.
- npm dependency audit: zero reported vulnerabilities after overriding the vulnerable transitive `deepmerge-ts` release to its patched version. Prisma generation/migration/build were verified with that override.

## Findings fixed during verification

- Explicit CommonJS package configuration conflicted with Next.js ESM application files; switched to ESM.
- Simultaneous order requests exposed the default transaction-acquisition wait; increased the bounded wait and retried serialization/unique-key conflicts.
- Server/browser AZN locale formatting differed; replaced it with deterministic qəpik formatting.
- A test captured the tracking URL before navigation completed; added an explicit URL wait.
- Initial responsive screenshots captured the loading fallback; made loaded-page assertions mandatory before screenshots.
- Migration timestamp ordering was repaired locally and the resulting chain replayed against a fresh database.

## Not verified / external requirements

- No public deployment, production database, S3 upload, notification webhook, external email/SMS or online payment was tested. These require merchant/provider configuration. Online payment is intentionally unavailable.
- No Lighthouse score is claimed. Browser runs used local Chromium and a local development server, with no network or CPU throttling. No Safari/Firefox, physical mobile keyboard or screen-reader certification was performed.
- The Docker build and actual encrypted backup/restore procedure remain to be exercised on the deployment host. The included CI workflow has not been described as passed before its remote execution.
- Generated imagery and policy drafts are demo/setup content. Merchant review is required before real sales.

Screenshots remain in the ignored local `artifacts/screenshots` directory and are uploaded by CI as artifacts rather than committed to source.
