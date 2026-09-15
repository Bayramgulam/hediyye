import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "./db";
import { requireRole } from "./auth";
import { settingsSchema, priceConfiguration, emptyConfig } from "./domain";
import { serial, changeStatus, recordPayment } from "./orders";
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
const image = z
  .string()
  .max(500)
  .refine(
    (s) =>
      /^\/images\/[\w./-]+$/.test(s) ||
      /^\/uploads\/[\w.-]+$/.test(s) ||
      (!!process.env.MEDIA_PUBLIC_URL &&
        s.startsWith(process.env.MEDIA_PUBLIC_URL + "/")),
    "Yalnız mağazanın media ünvanına icazə verilir.",
  );
export const productSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2).max(100),
  description: z.string().max(2000),
  categoryId: z.string(),
  price: z.number().int().min(0).max(10000000),
  stock: z.number().int().min(0).max(100000),
  units: z.number().int().min(1).max(50),
  active: z.boolean(),
  image,
  cutout: z.union([image, z.literal("")]).optional(),
  compatibleBoxes: z.array(z.string()).min(1),
  variants: z
    .array(z.object({ name: z.string().max(100), value: z.string().max(100) }))
    .max(20),
});
export async function mutateAdmin(raw: unknown) {
  const input = z
    .object({
      action: z.string(),
      id: z.string().optional(),
      data: z.unknown(),
    })
    .parse(raw);
  const operational = ["status", "payment", "note"].includes(input.action);
  const actor = await requireRole(!operational);
  const id = input.id || "";
  if (input.action === "status") {
    const v = z
      .object({ status: z.string(), note: z.string().max(1000) })
      .parse(input.data);
    return changeStatus(id, v.status, actor.id, v.note);
  }
  if (input.action === "payment") return recordPayment(id, actor.id);
  if (input.action === "note") {
    const note = z.string().min(1).max(2000).parse(input.data);
    return serial(async (tx) => {
      const o = await tx.order.findUniqueOrThrow({ where: { id } });
      await tx.orderHistory.create({
        data: { orderId: id, status: o.status, note },
      });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: "ORDER_NOTE",
          entityId: id,
          detail: { note },
        },
      });
    });
  }
  return serial(async (tx) => {
    let entityId = id;
    if (input.action === "product") {
      const data = productSchema.parse(input.data);
      const { id: productId, ...rest } = data;
      const old = productId
        ? await tx.product.findUniqueOrThrow({ where: { id: productId } })
        : null;
      const saved = productId
        ? await tx.product.update({ where: { id: productId }, data: rest })
        : await tx.product.create({ data: rest });
      entityId = saved.id;
      if (!old || old.stock !== saved.stock)
        await tx.inventoryMovement.create({
          data: {
            productId: saved.id,
            delta: saved.stock - (old?.stock || 0),
            reason: "ADMIN_ADJUSTMENT",
          },
        });
    } else if (input.action === "settings") {
      const data = settingsSchema.parse(input.data);
      image.parse(data.heroImage);
      if (data.logo) image.parse(data.logo);
      if (data.pickup && !data.address.trim())
        throw Error("Təhvil üçün ünvan daxil edin.");
      await tx.settings.upsert({
        where: { id: "store" },
        create: { id: "store", data },
        update: { data },
      });
      entityId = "store";
    } else if (input.action === "box") {
      const data = z
        .object({
          id: z.string().min(1),
          name: z.string().min(2),
          dimensions: z.string(),
          price: z.number().int().min(0),
          capacity: z.number().int().min(1).max(100),
          colors: z.array(z.string().regex(/^#[a-fA-F0-9]{6}$/)).min(1),
          active: z.boolean(),
          image,
        })
        .parse(input.data);
      await tx.box.upsert({
        where: { id: data.id },
        create: data,
        update: data,
      });
      entityId = data.id;
    } else if (input.action === "packaging") {
      const data = z
        .object({
          id: z.string().min(1),
          name: z.string().min(2),
          kind: z.enum(["ribbon", "tissue", "extra"]),
          color: z.string().regex(/^#[a-fA-F0-9]{6}$/),
          price: z.number().int().min(0),
          active: z.boolean(),
        })
        .parse(input.data);
      await tx.packaging.upsert({
        where: { id: data.id },
        create: data,
        update: data,
      });
      entityId = data.id;
    } else if (input.action === "gift") {
      const data = z
        .object({
          id: z.string().optional(),
          slug: z.string().regex(/^[a-z0-9-]+$/),
          name: z.string().min(2),
          description: z.string().max(2000),
          occasion: z.string().max(100),
          boxId: z.string(),
          image,
          featured: z.boolean(),
          position: z.number().int().min(0),
          active: z.boolean(),
          components: z
            .array(
              z.object({
                productId: z.string(),
                quantity: z.number().int().min(1).max(20),
              }),
            )
            .min(1),
        })
        .parse(input.data);
      const { id: giftId, components, ...rest } = data;
      const catalog = {
        products: await tx.product.findMany(),
        boxes: await tx.box.findMany(),
        packaging: await tx.packaging.findMany(),
      };
      priceConfiguration(
        { ...emptyConfig(data.boxId), items: components },
        {
          ...catalog,
          products: catalog.products.map((p) => ({ ...p, stock: 100000 })),
        },
      );
      const saved = giftId
        ? await tx.gift.update({
            where: { id: giftId },
            data: {
              ...rest,
              components: { deleteMany: {}, create: components },
            },
          })
        : await tx.gift.create({
            data: { ...rest, components: { create: components } },
          });
      entityId = saved.id;
    } else if (input.action === "zone") {
      const data = z
        .object({
          id: z.string().optional(),
          name: z.string().min(2),
          fee: z.number().int().min(0),
          active: z.boolean(),
        })
        .parse(input.data);
      const { id: zoneId, ...rest } = data;
      const saved = zoneId
        ? await tx.deliveryZone.update({ where: { id: zoneId }, data: rest })
        : await tx.deliveryZone.create({ data: rest });
      entityId = saved.id;
    } else if (input.action === "slot") {
      const data = z
        .object({
          date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          label: z.string().min(3),
          capacity: z.number().int().min(0).max(1000),
        })
        .parse(input.data);
      const old = await tx.deliverySlot.findUnique({
        where: { date_label: { date: data.date, label: data.label } },
      });
      if (old && old.reserved > data.capacity)
        throw Error("Tutum mövcud sifariş sayından az ola bilməz.");
      const saved = await tx.deliverySlot.upsert({
        where: { date_label: { date: data.date, label: data.label } },
        create: data,
        update: { capacity: data.capacity },
      });
      entityId = saved.id;
    } else if (input.action === "category") {
      const data = z
        .object({
          id: z.string().regex(/^[a-z0-9-]+$/),
          name: z.string().min(2),
        })
        .parse(input.data);
      await tx.category.upsert({
        where: { id: data.id },
        create: data,
        update: { name: data.name },
      });
      entityId = data.id;
    } else if (input.action === "staff") {
      const data = z
        .object({
          email: z.email(),
          name: z.string().min(2),
          password: z.string().min(12).max(128),
        })
        .parse(input.data);
      const uid = randomUUID();
      await tx.user.create({
        data: {
          id: uid,
          email: data.email,
          name: data.name,
          role: "STAFF",
          accounts: {
            create: {
              id: randomUUID(),
              providerId: "credential",
              accountId: uid,
              password: await hashPassword(data.password),
            },
          },
        },
      });
      entityId = uid;
    } else throw Error("Əməliyyat mövcud deyil.");
    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        action: input.action.toUpperCase(),
        entityId,
        detail: { updated: true } as Prisma.InputJsonValue,
      },
    });
    return { id: entityId };
  });
}
