import { createAuthClient } from "better-auth/react"
import { convexClient, crossDomainClient } from "@convex-dev/better-auth/client/plugins"

const convexSiteUrl = import.meta.env.VITE_CONVEX_SITE_URL

if (!convexSiteUrl) {
  throw new Error("VITE_CONVEX_SITE_URL environment variable is required")
}

export const authClient = createAuthClient({
  baseURL: convexSiteUrl,
  plugins: [
    convexClient(),      // Required for Convex JWT tokens
    // @ts-expect-error - Type mismatch between better-auth and @convex-dev/better-auth plugin types
    crossDomainClient({
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      storagePrefix: "better-auth",
    }), // Required for SPAs on different domains
  ],
})

export const {
  useSession,
  signIn,
  signUp,
  signOut,
} = authClient
