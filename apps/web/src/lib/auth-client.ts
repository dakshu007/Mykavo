"use client";

import { createAuthClient } from "better-auth/react";
import { twoFactorClient } from "better-auth/client/plugins";

// No twoFactorPage redirect: the auth form handles the TOTP step inline by
// reading `twoFactorRedirect` off the sign-in response.
export const authClient = createAuthClient({
  plugins: [twoFactorClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;
