import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { rateLimit, apiError } from "@/lib/security";
const handlers = toNextJsHandler(auth);
export const GET = handlers.GET;
export async function POST(request: Request) {
  try {
    await rateLimit(request, "auth", 20);
    return handlers.POST(request);
  } catch (e) {
    return apiError(e);
  }
}
