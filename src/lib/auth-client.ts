import { createAuthClient } from "better-auth/react";
import { adminClient, usernameClient } from "better-auth/client/plugins";

// Browser-side Better Auth client (the server instance lives in
// src/server/auth.ts). Same-origin, so no baseURL needed. The plugins mirror
// the server's so sign-in/up methods and admin calls are fully typed.
const authClient = createAuthClient({
  plugins: [usernameClient(), adminClient()],
});

export { authClient };
