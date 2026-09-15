import { placeOrder } from "@/lib/orders";
import { readBody, rateLimit, apiError } from "@/lib/security";
export async function POST(r: Request) {
  try {
    await rateLimit(r, "orders");
    return Response.json(await placeOrder(await readBody(r)));
  } catch (e) {
    return apiError(e);
  }
}
