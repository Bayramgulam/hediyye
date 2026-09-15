# LUMA implementation

Architecture: Next.js App Router modular monolith, strict TypeScript, Prisma 6 / PostgreSQL, Better Auth, Zod, integer qəpik pricing. Catalog and editorial pages server rendered; builder and cart are isolated client components. Order services enforce current pricing, capacity, compatibility, inventory and delivery in a serializable transaction. Private tracking uses hashed random tokens. OWNER manages catalog/settings; STAFF handles fulfillment.

Design: warm ivory / ink, burgundy actions, editorial serif and readable sans with Azerbaijani glyphs, asymmetric image-led hero and layered 2D builder. Generated images are explicitly demo content.

Sequence: schema/domain → end-to-end order → storefront/admin → verification. No public deployment authorized. Merchant contact, delivery and policies remain configurable setup content.

Status: storefront, builder, guest ordering, private tracking, protected admin, media adapter, optional notification outbox, development seed and operations documentation implemented. Domain/database and browser tests have passed; final verification notes are in docs/VERIFICATION.md. Public deployment is not authorized. User additionally authorized pushing source to https://github.com/Bayramgulam/hediyye; source branch: codex/luma-commerce.
