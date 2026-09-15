import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { headers } from "next/headers";
import { db } from "./db";
export const auth = betterAuth({
  database: prismaAdapter(db, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 12,
  },
  user: {
    additionalFields: {
      role: { type: "string", defaultValue: "STAFF", input: false },
    },
  },
  rateLimit: { enabled: true },
  advanced: {
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
  },
});
export async function requireRole(owner = false) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw Error("UNAUTHORIZED");
  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (
    !user ||
    !["OWNER", "STAFF"].includes(user.role) ||
    (owner && user.role !== "OWNER")
  )
    throw Error("FORBIDDEN");
  return user;
}
