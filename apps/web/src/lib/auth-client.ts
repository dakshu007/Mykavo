"use client";

import { createAuthClient } from "better-auth/react";
import { emailOTPClient, twoFactorClient } from "better-auth/client/plugins";

// No twoFactorPage redirect: the auth form handles the TOTP step inline by
// reading `twoFactorRedirect` off the sign-in response. emailOTPClient gives
// the form emailOtp.sendVerificationOtp / verifyEmail for the code step new
// email/password accounts go through.
export const authClient = createAuthClient({
  plugins: [twoFactorClient(), emailOTPClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;
