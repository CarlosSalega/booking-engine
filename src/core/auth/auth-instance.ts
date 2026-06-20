import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth";

import { prisma } from "@/lib/prisma";
import { SESSION_DURATION } from "@/modules/auth/domain";

/**
 * Better Auth instance — singleton configured for the booking engine.
 *
 * - Prisma adapter (PostgreSQL) for the user/session/account/verification models
 *   declared in `prisma/schema.prisma`.
 * - Email + password auth enabled.
 * - `role` declared as a required additional field on the User model; new
 *   registrations MUST supply it (the registration action defaults to PATIENT).
 * - `databaseHooks.session.create.before` reads the user's role and overrides
 *   the default session expiration with the per-role duration from the auth
 *   module's domain layer.
 */
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: { enabled: true },
  user: {
    additionalFields: {
      role: { type: "string", required: true },
    },
  },
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          const user = await prisma.user.findUnique({
            where: { id: session.userId },
          });
          if (!user?.role) return;
          const duration =
            SESSION_DURATION[user.role as keyof typeof SESSION_DURATION];
          if (duration === undefined) return;
          return {
            data: { ...session, expiresAt: new Date(Date.now() + duration * 1000) },
          };
        },
      },
    },
  },
});

export type Auth = typeof auth;
