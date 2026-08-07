import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, username } from "better-auth/plugins";
import { db } from "@/src/clients/drizzle";
import * as schema from "@/src/clients/drizzle/schema";
import { authConfig } from "@/src/config/settings";

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
  plugins: [username(), admin()],
});

export { auth };
