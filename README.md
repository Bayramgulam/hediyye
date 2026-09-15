# LUMA

Gift commerce for Azerbaijan: Azerbaijani storefront, AZN integer-qəpik pricing, a five-step gift builder, PostgreSQL order processing, guest checkout, private tracking, and role-protected administration.

## Run locally

Requires Node.js 22+ (verified with Node 24), npm and PostgreSQL. From the repository root:

```sh
npm ci
cp .env.example .env
# Set BETTER_AUTH_SECRET to a cryptographically random value of at least 32 characters.
docker compose up -d db
npm run db:migrate
npm run db:seed
npm run dev
```

On PowerShell, use `Copy-Item .env.example .env`. Generate a secret with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` and save it only in `.env`.

Open http://localhost:3000. `.env`, `.local`, uploads and database files are ignored by Git. The checked-in database password is for the loopback-only development container, never production.

### If Docker cannot run

```sh
npm run db:local
```

Keep that terminal running. This starts actual PostgreSQL binaries on `127.0.0.1:5432`, with persistent files in `.local/postgres`. In another terminal run migrations, seed and the app. Do not run this together with a database already occupying port 5432. If your npm configuration blocks install scripts, run the installed package's documented hydration script: `node node_modules/@embedded-postgres/windows-x64/scripts/hydrate-symlinks.js` on Windows. Shut down with Ctrl+C. The packaged database is a local development alternative; production should use managed PostgreSQL or the supported PostgreSQL container.

## Administration

There are no seeded administrator passwords. Create the first OWNER using environment variables:

```powershell
$env:ADMIN_EMAIL = 'your-email@example.com'
$env:ADMIN_PASSWORD = 'choose-a-unique-long-password'
npm run admin:bootstrap
Remove-Item Env:ADMIN_PASSWORD
```

Sign in at `/admin`. Bootstrap refuses to run if an OWNER already exists. OWNER can add STAFF through the team section. STAFF can view operational totals/orders and record fulfillment, internal notes and payments; catalog, delivery, media, settings and team operations require OWNER server-side.

The seed supplies 18 illustrative products, three boxes, six gifts and packaging. Products with independent stock (including color/size variants) are separate catalog entries; the variant metadata field adds display attributes. Archive products with the Active checkbox. Existing orders retain immutable names, prices, quantities, packaging and card snapshots.

Delivery, pickup and cash payment are **disabled initially**. To exercise checkout, set the merchant's pickup address and enable pickup plus cash-on-pickup, or create a delivery zone and enable delivery plus cash-on-delivery. Add a future available slot in `/admin/delivery`. Settings contain lead days, Baku cutoff hour, disabled dates and reservation expiry. No online card method is shown.

## Verification

```sh
npm run typecheck
npm run lint
npm test
# Against the local development DB only:
# PowerShell: $env:RUN_DB_TESTS='1'
RUN_DB_TESTS=1 npm test
npm run db:verify-migrations
npx playwright install chromium
# Keep npm run dev running; do not run DB integration tests concurrently with E2E:
npm run test:e2e
npm run build
```

Database tests and E2E create explicitly fictional test records and temporary randomly credentialed users, then clean their fixtures. They temporarily configure pickup; do not run them against a live merchant database. Screenshots are saved under `artifacts/screenshots`. See [verification notes](docs/VERIFICATION.md) for actual results and limits.

## Operations and deployment

See [operations](docs/OPERATIONS.md) for Docker deployment, media storage, jobs, backup/restore, authentication and production requirements. The app has not been publicly deployed. Source is prepared for a Node container behind an HTTPS reverse proxy.

## Merchant setup before launch

- Replace illustrative product images, cutouts, descriptions, variants, prices and inventory with verified merchant data.
- Set the brand/logo, hero image/copy, contact information, optional WhatsApp and Instagram.
- Configure and verify pickup/delivery, fees, dates, slot capacity, preparation lead time, cutoff and cash acceptance.
- Review the editable privacy, delivery and terms drafts for the actual business and applicable obligations.
- Configure production database, unique secrets, HTTPS, S3 media, backups and scheduled reservation cleanup.
- Optionally configure the notification webhook. No emails or messages are claimed to be sent when it is disabled.

Asset provenance and generation prompts: [docs/ASSETS.md](docs/ASSETS.md).
