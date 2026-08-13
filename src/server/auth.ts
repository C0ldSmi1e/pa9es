import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, username } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { credits, referrals } from "@/src/config/constants";
import { grantCredits } from "@/src/server/actions/credits";
import { db } from "@/src/server/db";
import * as schema from "@/src/server/db/schema";
import { sendEmail } from "@/src/server/emails/send";
import {
  resetPasswordEmail,
  verificationEmail,
} from "@/src/server/emails/templates";
import { authConfig } from "@/src/server/env";
import { usernameSchema } from "@/src/schemas/user";

// Minimal cookie read for the referral attribution below — the only place
// outside Better Auth that needs a request cookie, not worth a dependency.
const readCookie = (header: string | null, name: string): string | null => {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) {
      return decodeURIComponent(rest.join("="));
    }
  }
  return null;
};

const auth = betterAuth({
  secret: authConfig.secret,
  baseURL: authConfig.url,
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    // Unverified accounts can't sign in.
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      const { subject, html } = resetPasswordEmail({ name: user.name, url });
      await sendEmail({ to: user.email, subject, html });
    },
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
  },
  emailVerification: {
    sendOnSignUp: true,
    // Re-send the link when an unverified account tries to sign in; the
    // login form's "we sent you a new link" message relies on this.
    sendOnSignIn: true,
    // Clicking the link both verifies and signs in, so the emailed
    // callbackURL (/app) renders the dashboard directly.
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60,
    sendVerificationEmail: async ({ user, url }) => {
      const { subject, html } = verificationEmail({ name: user.name, url });
      await sendEmail({ to: user.email, subject, html });
    },
  },
  user: {
    additionalFields: {
      // Referral attribution (referrer's user id). input: false — the
      // signup request body can never set it; only the create.before hook
      // below writes it, from the pa9es_ref cookie.
      referredBy: { type: "string", required: false, input: false },
    },
  },
  databaseHooks: {
    user: {
      create: {
        // Referral attribution: resolve the pa9es_ref cookie (set by
        // ReferralCapture on any ?ref= landing) to a user id. Invalid or
        // unknown refs never block signup — attribution is best-effort.
        // Self-referral is structurally impossible: the ref names an
        // existing username, which the new account cannot have.
        before: async (userData, ctx) => {
          const raw = readCookie(
            ctx?.request?.headers.get("cookie") ?? null,
            "pa9es_ref",
          );
          if (!raw) {
            return;
          }
          const parsed = usernameSchema.safeParse(raw);
          if (!parsed.success) {
            return;
          }
          const [referrer] = await db
            .select({ id: schema.user.id })
            .from(schema.user)
            .where(eq(schema.user.username, parsed.data))
            .limit(1);
          if (!referrer) {
            return;
          }
          return { data: { ...userData, referredBy: referrer.id } };
        },
        // Signup bonus, plus the referee side of a referral. Both keyed on
        // the user id, so a replayed hook can never double-grant.
        after: async (createdUser) => {
          grantCredits({
            userId: createdUser.id,
            amount: credits.signupBonus,
            kind: "signup_bonus",
            refId: createdUser.id,
          });
          const { referredBy } = createdUser as { referredBy?: string | null };
          if (referredBy) {
            grantCredits({
              userId: createdUser.id,
              amount: referrals.refereeBonus,
              kind: "referral_bonus",
              refId: createdUser.id,
            });
          }
        },
      },
    },
  },
  plugins: [
    username({
      minUsernameLength: 3,
      maxUsernameLength: 63,
      usernameValidator: (value) => usernameSchema.safeParse(value).success,
    }),
    admin(),
  ],
});

export { auth };
