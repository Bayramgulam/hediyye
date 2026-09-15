# LUMA operations

## Architecture

Next.js App Router / React with strict TypeScript; PostgreSQL and Prisma migrations; Better Auth credential sessions; Zod request validation. A modular monolith: `src/lib/domain.ts` handles configuration, pricing, dates and state transitions; `orders.ts` owns transactional ordering; `admin.ts` owns authorized mutations. Storefront and editorial pages are server rendered. Builder, cart, forms and admin controls are client components. Public reads are deduplicated per server request; stock is always reloaded for checkout. Cross-request catalog caching is deliberately conservative to avoid stale inventory.

Money is integer qəpik. Formatting is deterministic on server/browser. Capacity units express merchant packing rules, not a physical packing simulation. A product can be restricted to explicit box IDs. Multiple variants with independent stock should be entered as separate products; variant metadata is descriptive, not an additional inventory pool.

An order transaction reloads all selected data, checks packaging/capacity/compatibility, verifies enabled cash and fulfillment settings, calculates the current total, atomically decrements product stock with a nonnegative predicate, reserves a delivery slot, and creates immutable line snapshots. PostgreSQL SERIALIZABLE isolation, guarded updates, checks and bounded retries prevent overselling. Repeated requests use a unique UUID idempotency key plus a hash of the normalized payload. The browser retains only the key in session storage; address and phone fields stay in memory until submission.

Tracking links contain a 256-bit HMAC derived from a random checkout UUID using the server secret. Only the token hash is stored. The HMAC allows an idempotent retry to return the same tracking link without storing plaintext tokens. Keep the secret stable and backed up; rotating it invalidates sessions and prevents regeneration of previous idempotent links, although existing links still validate against their stored hashes. Public tracking only selects reference, state, payment state, total and status timestamps. No customer/address/card information is returned.

## Deployment target

Use the included Dockerfile on a Node-capable host with PostgreSQL and S3-compatible media. No deployment has been made and no paid service is required by the source. Suggested sequence:

1. Provision a private PostgreSQL database and set a unique password. Use a connection URL with TLS according to the provider.
2. Set all production environment variables. `BETTER_AUTH_URL` and `NEXT_PUBLIC_SITE_URL` must be the exact HTTPS origin. Never expose `BETTER_AUTH_SECRET` to browser code.
3. Build the image with the intended `NEXT_PUBLIC_SITE_URL` build argument.
4. Run `npm run db:migrate` from the release image before application rollout. Never run development seed in production.
5. Bootstrap the OWNER securely, then remove bootstrap password variables.
6. Point an HTTPS reverse proxy at port 3000. Restrict direct access to the app port.
7. Configure the merchant catalog and settings, then test a real fulfillment rehearsal before enabling public checkout.

Dockerfile build has no dependency on a live database. It uses a build-only placeholder connection string for Prisma generation. Runtime secrets must be injected by the host. Container runtime includes source/tools for the maintenance commands; optimize this into separate worker images later if image size becomes important.

The reverse proxy must overwrite `X-Real-IP` from the verified client connection, never trust user-supplied forwarding headers. Database-backed rate limits use this address (hashed) for auth, contact and order attempts. Missing IP headers share a conservative fallback bucket. Set proxy body limits to 5 MB (media) and ideally 32 KB for ordinary JSON endpoints. Never log request bodies, cookies or query/path tokens; redact `/izle/*` and confirmation token query strings in access logs.

Private routes are dynamic with no-store headers and noindex metadata. No analytics integration is installed. Do not add private-route analytics or public CDN caching. A reverse proxy must preserve these headers. App health: `GET /api/health` performs a database read and returns 200/503.

## Media

Production requires `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, and `MEDIA_PUBLIC_URL`. Only OWNER can upload. The server allows JPEG/PNG/WebP, checks decoded dimensions/pixel count, limits size, re-encodes WebP (stripping metadata), and generates random keys. SVG and active content are rejected. Catalog URL fields accept local media or the configured public media origin only.

Local development without S3 writes to `public/uploads` (ignored). Production never silently uses ephemeral local media. Configure bucket lifecycle/versioning, least-privilege write credentials, and CDN delivery. Production S3 was not exercised because no credentials were supplied.

## Reservation cleanup

Run every five minutes from one scheduled worker:

```sh
npm run reservations:cleanup
```

NEW orders expire according to `reservationHours`. Cleanup rechecks NEW state and expiry inside the cancellation transaction, so a concurrently confirmed order is preserved. Cancellation increments reserved stock and releases the slot exactly once; `releasedAt` and state-transition rules guard retries. Confirmed/preparing orders do not expire automatically. Successful deliveries consume their reserved stock permanently. Past slots retain historical reservation counts and should not be reused for a new date.

## Payments and notifications

Only merchant-enabled cash at delivery/pickup is available. Payment status is distinct from fulfillment status. An operational user can record full receipt once; a Payment record and audit entry preserve actor/time/amount. A cancelled paid order retains its payment history. Refunds/corrections require the merchant's accounting process; an online refund interface is not implemented. `payments.ts` defines the provider boundary for a future real online adapter; no bank API or fake card form exists.

Optional webhook notifications use `NOTIFICATION_WEBHOOK_URL` plus `NOTIFICATION_WEBHOOK_SECRET`. When enabled, order creation writes an outbox row in the same transaction. Run `npm run notifications:send` every minute. The worker sends only order reference and event, outside the transaction, and retries with exponential backoff. Delivery is at least once: the receiver **must deduplicate the Idempotency-Key header**. Run one worker unless the receiver supports concurrent deduplication. No webhook credentials means no outbox/enqueue/send claim and checkout still works. Integration with an actual webhook endpoint was not tested.

## Backups and restore

Take encrypted daily PostgreSQL custom-format backups and retain off-host copies according to the merchant's retention policy. Use the server's matching PostgreSQL tools:

```sh
pg_dump --format=custom --file=luma-backup.dump "$DATABASE_URL"
# Restore to a NEW empty database first; do not overwrite the live database:
pg_restore --no-owner --dbname="$RESTORE_DATABASE_URL" luma-backup.dump
```

Back up media objects and the secret store separately. Test a restoration to an isolated database, verify order counts/line snapshots, then point a private staging app to it and check health/admin. Fresh schema migration replay was tested; an actual production backup/restore was not possible without a production database. Never commit dumps or secrets.

## Known scope limits

- Single merchant, AZN; no customer accounts, marketplace or subscriptions.
- Advanced catalog configuration (compatibility, variants, gift components, policy text) currently uses validated structured JSON fields in admin. Ordinary names, prices, stock, media, delivery and order operations have regular controls.
- Box compatibility is stored as explicit PostgreSQL string arrays and validated against the selected box; it is not a physical packing model.
- No external email, SMS, online banking or S3 provider was exercised without credentials.
- Browser verification is Chromium only; no Safari/Firefox, real mobile keyboard or assistive-technology certification was performed.
