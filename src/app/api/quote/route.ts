import { getCatalog } from "@/lib/catalog";
import { priceConfiguration, configSchema } from "@/lib/domain";
import { readBody, apiError } from "@/lib/security";
import { z } from "zod";
export async function POST(r: Request) {
  try {
    const items = z
      .array(
        z.object({
          config: configSchema,
          quantity: z.number().int().min(1).max(10),
        }),
      )
      .max(20)
      .parse(await readBody(r));
    const catalog = await getCatalog();
    return Response.json({
      total: items.reduce(
        (sum, i) =>
          sum + priceConfiguration(i.config, catalog).total * i.quantity,
        0,
      ),
    });
  } catch (e) {
    return apiError(e);
  }
}
