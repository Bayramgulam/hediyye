import { mutateAdmin } from "@/lib/admin";
import { readBody, apiError } from "@/lib/security";
export async function POST(r: Request) {
  try {
    return Response.json({
      ok: true,
      result: await mutateAdmin(await readBody(r)),
    });
  } catch (e) {
    return apiError(e);
  }
}
