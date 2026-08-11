import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, username } from "better-auth/plugins";
import { db } from "@/src/server/db";
import * as schema from "@/src/server/db/schema";
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
