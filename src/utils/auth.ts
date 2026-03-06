import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { database } from "../db";
import { privateEnv } from "~/config/privateEnv";

const configuredTrustedOrigins = Array.from(
  new Set(
    [
      process.env.DEPLOY_PRIME_URL,
      process.env.URL,
      ...privateEnv.BETTER_AUTH_TRUSTED_ORIGINS,
    ].filter(
      (origin): origin is string => Boolean(origin),
    ),
  ),
);

function getFirstHeaderValue(value: string | null): string | null {
  return value?.split(",")[0]?.trim() || null;
}

function getRequestOrigin(request?: Request): string | null {
  if (!request) {
    return null;
  }

  try {
    const requestUrl = new URL(request.url);
    const forwardedProto = getFirstHeaderValue(
      request.headers.get("x-forwarded-proto"),
    );
    const forwardedHost = getFirstHeaderValue(
      request.headers.get("x-forwarded-host"),
    );
    const host =
      forwardedHost ||
      getFirstHeaderValue(request.headers.get("host")) ||
      requestUrl.host;
    const protocol =
      forwardedProto || requestUrl.protocol.replace(/:$/, "");

    if (!host || !protocol) {
      return requestUrl.origin;
    }

    return new URL(`${protocol}://${host}`).origin;
  } catch {
    return null;
  }
}

export const auth = betterAuth({
  baseURL: privateEnv.BETTER_AUTH_URL,
  trustedOrigins: (request) =>
    Array.from(
      new Set(
        [
          ...configuredTrustedOrigins,
          getRequestOrigin(request),
        ].filter((origin): origin is string => Boolean(origin)),
      ),
    ),
  advanced: {
    trustedProxyHeaders: true,
  },
  database: drizzleAdapter(database, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: privateEnv.GOOGLE_CLIENT_ID,
      clientSecret: privateEnv.GOOGLE_CLIENT_SECRET,
    },
  },
});
