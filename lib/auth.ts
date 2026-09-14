import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";

import { db } from "@/lib/db";
import * as schema from "@/lib/schema";

const configuredBaseURL = process.env.BETTER_AUTH_URL;
const deploymentURL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : undefined;
const branchURL = process.env.VERCEL_BRANCH_URL
  ? `https://${process.env.VERCEL_BRANCH_URL}`
  : undefined;
const baseURL =
  process.env.VERCEL_ENV === "preview"
    ? (branchURL ?? deploymentURL)
    : configuredBaseURL;
const secret = process.env.BETTER_AUTH_SECRET;
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (!baseURL || !secret || !googleClientId || !googleClientSecret) {
  throw new Error("Better Auth environment variables are incomplete.");
}

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  baseURL,
  secret,
  trustedOrigins: Array.from(
    new Set(
      [baseURL, configuredBaseURL, branchURL, deploymentURL].filter(Boolean)
    )
  ) as string[],
  socialProviders: {
    google: {
      clientId: googleClientId,
      clientSecret: googleClientSecret,
      prompt: "select_account",
    },
  },
  plugins: [nextCookies()],
});
