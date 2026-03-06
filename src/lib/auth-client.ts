import { createAuthClient } from "better-auth/react";

const configuredAuthBaseURL = import.meta.env.VITE_AUTH_CLIENT_BASE_URL?.trim();

const authBaseURL =
  !configuredAuthBaseURL ||
  configuredAuthBaseURL.toLowerCase() === "same-origin"
    ? undefined
    : configuredAuthBaseURL;

export const authClient = createAuthClient({
  // Keep same-origin by default. Override via VITE_AUTH_CLIENT_BASE_URL when needed.
  baseURL: authBaseURL,
});
