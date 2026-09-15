import "dotenv/config";
import { test, expect } from "@playwright/test";
import { randomUUID, randomBytes } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { PrismaClient, Prisma } from "@prisma/client";
import { defaultSettings } from "../src/lib/domain";
import { mkdirSync } from "node:fs";
const db = new PrismaClient();
const uid = randomUUID(),
  staffId = randomUUID();
const password = randomBytes(24).toString("hex");
const email = `${uid}@example.test`;
const staffEmail = `${staffId}@example.test`;
let settings: Prisma.JsonValue;
let slotId = "";
let orderId = "";
let tracking = "";
let stock = 0;
test.beforeAll(async () => {
  if (!process.env.DATABASE_URL?.includes("localhost"))
    throw Error("E2E fixtures require localhost database.");
  settings = (await db.settings.findUniqueOrThrow({ where: { id: "store" } }))
    .data;
  stock = (await db.product.findUniqueOrThrow({ where: { id: "p0" } })).stock;
  await db.product.update({ where: { id: "p0" }, data: { stock: 30 } });
  await db.settings.update({
    where: { id: "store" },
    data: {
      data: {
        ...defaultSettings,
        pickup: true,
        cashPickup: true,
        address: "TEST ONLY — local browser verification",
        leadDays: 0,
      },
    },
  });
  const date = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  slotId = (
    await db.deliverySlot.create({ data: { date, label: uid, capacity: 20 } })
  ).id;
  for (const [id, mail, role] of [
    [uid, email, "OWNER"],
    [staffId, staffEmail, "STAFF"],
  ])
    await db.user.create({
      data: {
        id,
        email: mail,
        name: "AUTOMATED TEST",
        role,
        accounts: {
          create: {
            id: randomUUID(),
            accountId: id,
            providerId: "credential",
            password: await hashPassword(password),
          },
        },
      },
    });
  mkdirSync("artifacts/screenshots", { recursive: true });
});
test.afterAll(async () => {
  if (orderId) {
    await db.payment.deleteMany({ where: { orderId } });
    await db.orderHistory.deleteMany({ where: { orderId } });
    await db.reservation.deleteMany({ where: { orderId } });
    await db.orderItem.deleteMany({ where: { orderId } });
    await db.order.delete({ where: { id: orderId } });
  }
  await db.user.deleteMany({ where: { id: { in: [uid, staffId] } } });
  await db.deliverySlot.delete({ where: { id: slotId } });
  await db.product.update({ where: { id: "p0" }, data: { stock } });
  await db.settings.update({
    where: { id: "store" },
    data: { data: settings as Prisma.InputJsonValue },
  });
  await db.$disconnect();
});
test("builder → persisted cart → real order → admin → private tracking", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Bir qutu",
  );
  await page.screenshot({
    path: "artifacts/screenshots/home-desktop.png",
    fullPage: true,
  });
  await page
    .getByRole("link", { name: "Öz qutunu yarat", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Qutunu seç", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Davam et", exact: true }).click();
  await page
    .getByRole("button", { name: "Keramika fincan əlavə et", exact: true })
    .click();
  await page.getByRole("button", { name: "Davam et", exact: true }).click();
  await page.getByRole("button", { name: "Pudra Daxildir" }).click();
  await page.getByRole("button", { name: "Davam et", exact: true }).click();
  await page.getByLabel("Kimə?", { exact: true }).fill("Əziz dostum");
  await page.getByLabel("Kimdən?", { exact: true }).fill("LUMA sınaq");
  await page
    .getByLabel("Ürəyindən keçənlər")
    .fill("Ən gözəl günlər sənin olsun!");
  await page.screenshot({
    path: "artifacts/screenshots/builder-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Davam et", exact: true }).click();
  await page
    .getByRole("button", { name: "Səbətə əlavə et", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Sənin səbətin." }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByText("Keramika fincan × 1")).toBeVisible();
  await page.getByRole("button", { name: "Sifarişə keç" }).click();
  await expect(
    page.getByRole("heading", { name: "Son detallar." }),
  ).toBeVisible();
  await page.screenshot({
    path: "artifacts/screenshots/checkout-desktop.png",
    fullPage: true,
  });
  await page.getByLabel("Ad və soyad", { exact: true }).fill("AUTOMATED TEST");
  await page.getByLabel("Telefon", { exact: true }).fill("0501234567");
  await page.getByLabel("Alıcının adı", { exact: true }).fill("TEST RECIPIENT");
  await page.getByLabel("Tarix və vaxt").selectOption(slotId);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Sifarişi tamamla" }).click();
  await expect(
    page.getByRole("heading", { name: "Sifarişin qəbul edildi." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Sifarişimi izlə" }).click();
  await page.waitForURL("**/izle/**");
  tracking = page.url();
  const order = await db.order.findFirstOrThrow({
    where: { customer: { path: ["name"], equals: "AUTOMATED TEST" } },
  });
  orderId = order.id;
  expect(order.total).toBe(3300);
  await page.goto("/admin");
  await page.getByLabel("E-poçt", { exact: true }).fill(email);
  await page.getByLabel("Şifrə", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Daxil ol" }).click();
  await expect(
    page.getByRole("heading", { name: "Mağazaya baxış" }),
  ).toBeVisible();
  await page.screenshot({
    path: "artifacts/screenshots/admin-desktop.png",
    fullPage: true,
  });
  await page.goto("/admin/orders/" + orderId);
  await page.getByRole("button", { name: "Təsdiqləndi", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Hazırlanır", exact: true }),
  ).toBeVisible();
  await page.goto(tracking);
  await expect(
    page.getByRole("heading", { name: "Təsdiqləndi", exact: true, level: 1 }),
  ).toBeVisible();
  await expect(page.getByText("0501234567")).toHaveCount(0);
  expect(
    await page.locator("meta[name=robots]").getAttribute("content"),
  ).toContain("noindex");
});
test("responsive layouts and no horizontal overflow", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/admin");
  await page.getByLabel("E-poçt", { exact: true }).fill(email);
  await page.getByLabel("Şifrə", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Daxil ol" }).click();
  await expect(
    page.getByRole("heading", { name: "Mağazaya baxış" }),
  ).toBeVisible();
  await page.goto("/qutunu-yarat?product=p0&step=5");
  await page
    .getByRole("button", { name: "Səbətə əlavə et", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Sənin səbətin." }),
  ).toBeVisible();
  for (const width of [360, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [route, name] of [
      ["/", "home"],
      ["/qutunu-yarat", "builder"],
      ["/sifaris", "checkout"],
      ["/admin", "admin"],
    ]) {
      await page.goto(route);
      await expect(page.getByRole('heading',{level:1})).toBeVisible();
      await expect(page.locator('.loading')).toHaveCount(0);
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(() => window.scrollTo(0, 0));
      const size = await page.evaluate(() => ({
        width: window.innerWidth,
        scroll: document.documentElement.scrollWidth,
      }));
      expect(size.scroll, `${route} at ${width}`).toBeLessThanOrEqual(
        size.width,
      );
      await page.screenshot({
        path: `artifacts/screenshots/${name}-${width}.png`,
        fullPage: true,
      });
    }
  }
});
test("stock, input validation, origin checks, and staff permissions", async ({
  page,
  request,
}) => {
  await page.goto("/qutunu-yarat?step=2");
  await expect(
    page.getByRole("button", { name: "Çiçəkli kart əlavə et" }),
  ).toBeDisabled();
  await page.goto("/elaqe");
  await page.getByRole("button", { name: "Mesajı göndər" }).click();
  await expect(page.locator("input[name=name]:invalid")).toHaveCount(1);
  const denied = await request.post("/api/admin", {
    data: { action: "settings", data: {} },
    headers: { Origin: "http://localhost:3000" },
  });
  expect(denied.status()).toBe(401);
  const csrf = await request.post("/api/contact", {
    data: {},
    headers: { Origin: "https://untrusted.example" },
  });
  expect(csrf.status()).toBe(403);
  await page.goto("/admin");
  await page.getByLabel("E-poçt", { exact: true }).fill(staffEmail);
  await page.getByLabel("Şifrə", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Daxil ol" }).click();
  await expect(
    page.getByRole("heading", { name: "Mağazaya baxış" }),
  ).toBeVisible();
  const staffDenied = await page.request.post("/api/admin", {
    data: { action: "settings", data: {} },
    headers: { Origin: "http://localhost:3000" },
  });
  expect(staffDenied.status()).toBe(403);
  await page.goto("/izle/" + "a".repeat(64));
  await expect(
    page.getByRole("heading", { name: "Bu səhifə tapılmadı." }),
  ).toBeVisible();
});
