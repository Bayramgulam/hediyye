import { randomBytes, createHmac } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "./db";
import {
  configSchema,
  priceConfiguration,
  normalizePhone,
  validDeliveryDate,
  settingsSchema,
  canTransition,
} from "./domain";
import { hash } from "./security";
import { cashPayment } from "./payments";

export async function cleanupExpiredReservations() {
  const orders = await db.order.findMany({
    where: { status: "NEW", expiresAt: { lt: new Date() } },
    select: { id: true },
    take: 100,
  });
  let cleaned = 0;
  for (const order of orders) {
    try {
      await changeStatus(
        order.id,
        "CANCELLED",
        "reservation-cleanup",
        "Təsdiqlənmə müddəti bitdi.",
        true,
      );
      cleaned += 1;
    } catch {
      console.error("Reservation cleanup needs retry", order.id);
    }
  }
  return cleaned;
}
export const checkoutSchema = z.object({
  idempotencyKey: z.string().uuid(),
  items: z
    .array(
      z.object({
        config: configSchema,
        quantity: z.number().int().min(1).max(10),
      }),
    )
    .min(1)
    .max(20),
  customer: z.object({
    name: z.string().min(2).max(100),
    phone: z.string().max(30),
    email: z.union([z.email(), z.literal("")]),
    recipient: z.string().min(2).max(100),
    recipientPhone: z.string().max(30),
  }),
  delivery: z.object({
    method: z.enum(["delivery", "pickup"]),
    zoneId: z.string(),
    address: z.string().max(400),
    slotId: z.string(),
  }),
  note: z.string().max(1000),
});
const tokenFor = (key: string) =>
  createHmac("sha256", process.env.BETTER_AUTH_SECRET!)
    .update("tracking:" + key)
    .digest("hex");
export async function serial<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let i = 0; i < 4; i++) {
    try {
      return await db.$transaction(fn, {
        isolationLevel: "Serializable",
        timeout: 15000,
        maxWait: 15000,
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        ["P2034", "P2002"].includes(e.code) &&
        i < 3
      )
        continue;
      throw e;
    }
  }
  throw Error("Yenidən sınayın.");
}
export async function placeOrder(raw: unknown) {
  const input = checkoutSchema.parse(raw);
  input.customer.phone = normalizePhone(input.customer.phone);
  if (input.delivery.method === "delivery")
    input.customer.recipientPhone = normalizePhone(
      input.customer.recipientPhone,
    );
  const requestHash = hash(JSON.stringify(input));
  const token = tokenFor(input.idempotencyKey);
  const result = await serial(async (tx) => {
    const existing = await tx.order.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (existing) {
      if (existing.requestHash !== requestHash)
        throw Error("Sorğu açarı artıq istifadə olunub.");
      return existing;
    }
    const settings = settingsSchema.parse(
      (await tx.settings.findUniqueOrThrow({ where: { id: "store" } })).data,
    );
    const pickup = input.delivery.method === "pickup";
    if (!cashPayment.isAvailable(settings, input.delivery.method))
      throw Error("Bu təhvil və ödəniş üsulu hazırda aktiv deyil.");
    const slot = await tx.deliverySlot.findUnique({
      where: { id: input.delivery.slotId },
    });
    if (
      !slot ||
      !validDeliveryDate(slot.date, settings) ||
      slot.reserved >= slot.capacity
    )
      throw Error("Bu tarix və vaxt artıq mövcud deyil.");
    let fee = 0;
    let zoneName = "";
    if (!pickup) {
      const zone = await tx.deliveryZone.findUnique({
        where: { id: input.delivery.zoneId },
      });
      if (!zone?.active || input.delivery.address.trim().length < 8)
        throw Error("Çatdırılma zonasını və tam ünvanı seçin.");
      fee = zone.fee;
      zoneName = zone.name;
    }
    const catalog = {
      products: await tx.product.findMany(),
      boxes: await tx.box.findMany(),
      packaging: await tx.packaging.findMany(),
    };
    const priced = input.items.map((i) => ({
      quantity: i.quantity,
      priced: priceConfiguration(i.config, catalog),
    }));
    const needed = new Map<string, number>();
    for (const line of priced)
      for (const p of line.priced.items)
        needed.set(
          p.productId,
          (needed.get(p.productId) || 0) + p.quantity * line.quantity,
        );
    for (const [id, quantity] of [...needed].sort(([a], [b]) =>
      a.localeCompare(b),
    )) {
      const changed = await tx.product.updateMany({
        where: { id, stock: { gte: quantity }, active: true },
        data: { stock: { decrement: quantity } },
      });
      if (changed.count !== 1)
        throw Error("Seçilmiş məhsul üçün kifayət qədər stok yoxdur.");
      await tx.inventoryMovement.create({
        data: { productId: id, delta: -quantity, reason: "ORDER_RESERVED" },
      });
    }
    if (
      (
        await tx.deliverySlot.updateMany({
          where: { id: slot.id, reserved: { lt: slot.capacity } },
          data: { reserved: { increment: 1 } },
        })
      ).count !== 1
    )
      throw Error("Vaxt aralığı dolub.");
    const order = await tx.order.create({
      data: {
        reference: "LM-" + randomBytes(5).toString("hex").toUpperCase(),
        idempotencyKey: input.idempotencyKey,
        requestHash,
        tokenHash: hash(token),
        total: priced.reduce((n, l) => n + l.priced.total * l.quantity, fee),
        deliveryFee: fee,
        customer: input.customer,
        delivery: {
          ...input.delivery,
          zoneName,
          date: slot.date,
          slot: slot.label,
        },
        note: input.note,
        expiresAt: new Date(Date.now() + settings.reservationHours * 3600000),
        items: {
          create: priced.map((l) => ({
            quantity: l.quantity,
            total: l.priced.total,
            snapshot: JSON.parse(JSON.stringify(l.priced)),
          })),
        },
        reservations: {
          create: [...needed].map(([productId, quantity]) => ({
            productId,
            quantity,
          })),
        },
        history: { create: { status: "NEW", note: "Sifariş qəbul edildi." } },
      },
    });
    if (process.env.NOTIFICATION_WEBHOOK_URL) {
      await tx.notification.create({ data: { reference: order.reference } });
    }
    return order;
  });
  return { reference: result.reference, token, total: result.total };
}
export async function changeStatus(
  id: string,
  status: string,
  actorId: string,
  note = "",
  expireOnly = false,
) {
  return serial(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({
      where: { id },
      include: { reservations: true },
    });
    if (expireOnly && (order.status !== "NEW" || order.expiresAt > new Date()))
      return;
    const delivery = order.delivery as { method: string; slotId: string };
    if (!canTransition(order.status, status, delivery.method === "pickup"))
      throw Error("Bu status keçidi mümkün deyil.");
    if (status === "CANCELLED" && !order.releasedAt) {
      for (const r of order.reservations) {
        await tx.product.update({
          where: { id: r.productId },
          data: { stock: { increment: r.quantity } },
        });
        await tx.inventoryMovement.create({
          data: {
            productId: r.productId,
            delta: r.quantity,
            reason: "CANCELLED:" + id,
          },
        });
      }
      await tx.deliverySlot.update({
        where: { id: delivery.slotId },
        data: { reserved: { decrement: 1 } },
      });
    }
    await tx.order.update({
      where: { id },
      data: {
        status,
        ...(status === "CANCELLED" ? { releasedAt: new Date() } : {}),
        history: { create: { status, note } },
      },
    });
    await tx.auditLog.create({
      data: {
        actorId,
        action: "ORDER_STATUS",
        entityId: id,
        detail: { from: order.status, to: status },
      },
    });
  });
}
export async function recordPayment(id: string, actorId: string) {
  return serial(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({ where: { id } });
    if (order.paymentStatus === "PAID" || order.status === "CANCELLED")
      throw Error("Ödəniş artıq qeyd edilib və ya sifariş ləğv olunub.");
    await tx.payment.create({
      data: { orderId: id, actorId, amount: order.total },
    });
    await tx.order.update({ where: { id }, data: { paymentStatus: "PAID" } });
    await tx.auditLog.create({
      data: {
        actorId,
        action: "PAYMENT_RECORDED",
        entityId: id,
        detail: { amount: order.total },
      },
    });
  });
}
