import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "../src/lib/db";
import { placeOrder, changeStatus, recordPayment } from "../src/lib/orders";
import { emptyConfig, defaultSettings } from "../src/lib/domain";
import { hash } from "../src/lib/security";
const run = process.env.RUN_DB_TESTS === "1";
describe.runIf(run)("PostgreSQL order integrity", () => {
  const prefix = "test-" + randomUUID();
  let slotId = "";
  let savedSettings: unknown;
  const created: string[] = [];
  const productId = prefix;
  beforeAll(async () => {
    if (!process.env.DATABASE_URL?.includes("localhost"))
      throw Error("Integration tests require local database.");
    savedSettings = (
      await db.settings.findUniqueOrThrow({ where: { id: "store" } })
    ).data;
    await db.settings.update({
      where: { id: "store" },
      data: {
        data: {
          ...defaultSettings,
          pickup: true,
          cashPickup: true,
          address: "TEST ONLY",
          leadDays: 0,
        },
      },
    });
    await db.product.create({
      data: {
        id: productId,
        name: "TEST ONLY",
        categoryId: "cup",
        price: 2000,
        stock: 20,
        units: 1,
        compatibleBoxes: ["medium"],
        image: "/images/product-0.webp",
      },
    });
    const date = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
    slotId = (
      await db.deliverySlot.create({
        data: { date, label: prefix, capacity: 30 },
      })
    ).id;
  });
  afterAll(async () => {
    await db.$transaction(async (tx) => {
      const related = await tx.reservation.findMany({
        where: { productId },
        select: { orderId: true },
      });
      for (const id of [
        ...new Set([...created, ...related.map((r) => r.orderId)]),
      ]) {
        await tx.payment.deleteMany({ where: { orderId: id } });
        await tx.orderHistory.deleteMany({ where: { orderId: id } });
        await tx.reservation.deleteMany({ where: { orderId: id } });
        await tx.orderItem.deleteMany({ where: { orderId: id } });
        await tx.order.delete({ where: { id } });
      }
      await tx.inventoryMovement.deleteMany({ where: { productId } });
      await tx.product.delete({ where: { id: productId } });
      await tx.deliverySlot.delete({ where: { id: slotId } });
      await tx.settings.update({
        where: { id: "store" },
        data: { data: savedSettings as never },
      });
    });
    await db.$disconnect();
  });
  const input = () => ({
    idempotencyKey: randomUUID(),
    items: [
      {
        config: { ...emptyConfig(), items: [{ productId, quantity: 1 }] },
        quantity: 1,
      },
    ],
    customer: {
      name: "TEST ONLY",
      phone: "0501234567",
      email: "",
      recipient: "TEST ONLY",
      recipientPhone: "",
    },
    delivery: { method: "pickup", zoneId: "", address: "", slotId },
    note: "AUTOMATED TEST",
  });
  async function remember(reference: string) {
    const order = await db.order.findUniqueOrThrow({ where: { reference } });
    if (!created.includes(order.id)) created.push(order.id);
    return order;
  }
  it("deduplicates concurrent repeated requests and ignores client total", async () => {
    const data = { ...input(), total: 1 };
    const [a, b] = await Promise.all([placeOrder(data), placeOrder(data)]);
    expect(a.reference).toBe(b.reference);
    expect(a.total).toBe(3500);
    const o = await remember(a.reference);
    expect(o.tokenHash).toBe(hash(a.token));
    expect(o.tokenHash).not.toBe(a.token);
  });
  it("keeps immutable snapshots after product edits", async () => {
    const a = await placeOrder(input());
    const o = await remember(a.reference);
    await db.product.update({
      where: { id: productId },
      data: { name: "CHANGED", price: 9000 },
    });
    const line = await db.orderItem.findFirstOrThrow({
      where: { orderId: o.id },
    });
    expect(JSON.stringify(line.snapshot)).toContain("TEST ONLY");
    expect(line.total).toBe(3500);
    await db.product.update({
      where: { id: productId },
      data: { price: 2000 },
    });
  });
  it("cancels and releases inventory exactly once", async () => {
    const a = await placeOrder(input());
    const o = await remember(a.reference);
    const before = (
      await db.product.findUniqueOrThrow({ where: { id: productId } })
    ).stock;
    await changeStatus(o.id, "CANCELLED", "test");
    await expect(changeStatus(o.id, "CANCELLED", "test")).rejects.toThrow();
    expect(
      (await db.product.findUniqueOrThrow({ where: { id: productId } })).stock,
    ).toBe(before + 1);
  });
  it("cannot oversell the final unit under concurrency", async () => {
    await db.product.update({ where: { id: productId }, data: { stock: 1 } });
    const result = await Promise.allSettled([
      placeOrder(input()),
      placeOrder(input()),
    ]);
    expect(result.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    for (const r of result)
      if (r.status === "fulfilled") await remember(r.value.reference);
    expect(
      (await db.product.findUniqueOrThrow({ where: { id: productId } })).stock,
    ).toBe(0);
    await db.product.update({ where: { id: productId }, data: { stock: 10 } });
  });
  it("records payment once with an audit trail", async () => {
    const placed = await placeOrder(input());
    const order = await remember(placed.reference);
    await recordPayment(order.id, "test");
    await expect(recordPayment(order.id, "test")).rejects.toThrow();
    expect(await db.payment.count({ where: { orderId: order.id } })).toBe(1);
    expect(
      (await db.order.findUniqueOrThrow({ where: { id: order.id } }))
        .paymentStatus,
    ).toBe("PAID");
    expect(
      await db.auditLog.count({
        where: { entityId: order.id, action: "PAYMENT_RECORDED" },
      }),
    ).toBe(1);
  });
  it("cleanup does not cancel a concurrently confirmed order", async () => {
    const placed = await placeOrder(input());
    const order = await remember(placed.reference);
    await db.order.update({
      where: { id: order.id },
      data: { expiresAt: new Date(0) },
    });
    await changeStatus(order.id, "CONFIRMED", "test");
    await changeStatus(order.id, "CANCELLED", "cleanup", "", true);
    expect(
      (await db.order.findUniqueOrThrow({ where: { id: order.id } })).status,
    ).toBe("CONFIRMED");
  });
  it("cannot oversell final delivery slot", async () => {
    const slot = await db.deliverySlot.findUniqueOrThrow({
      where: { id: slotId },
    });
    await db.deliverySlot.update({
      where: { id: slotId },
      data: { capacity: slot.reserved + 1 },
    });
    const result = await Promise.allSettled([
      placeOrder(input()),
      placeOrder(input()),
    ]);
    expect(result.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    for (const r of result)
      if (r.status === "fulfilled") await remember(r.value.reference);
  });
  it("rejects stale delivery dates", async () => {
    await db.deliverySlot.update({
      where: { id: slotId },
      data: { date: "2020-01-01" },
    });
    await expect(placeOrder(input())).rejects.toThrow("tarix");
  });
});
