import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, username } from "better-auth/plugins";
import { db } from "@/src/server/db";
import * as schema from "@/src/server/db/schema";
import { sendEmail } from "@/src/server/emails/send";
import { verificationEmail } from "@/src/server/emails/templates";
import { authConfig } from "@/src/server/env";
import { usernameSchema } from "@/src/schemas/user";

const auth = betterAuth({
  secret: authConfig.secret,
  baseURL: authConfig.url,
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    // Unverified accounts can't sign in. Both sign-in paths honor this —
    // better-auth enforces it in /sign-in/email and the username plugin
    // repeats the check in /sign-in/username.
    requireEmailVerification: true,
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
