import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth";
import { expo } from "@better-auth/expo";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import authConfig from "./auth.config";

// Create the better-auth component client
export const authComponent = createClient<DataModel>(components.betterAuth);

// Check if running in development environment
// Set ENVIRONMENT=development on dev deployment, ENVIRONMENT=production on prod deployment
const isDevelopment = process.env.ENVIRONMENT !== "production";

// Get the Convex site URL for crossDomain plugin
// This should be set as an environment variable in Convex dashboard
const siteUrl = process.env.SITE_URL || "https://your-deployment.convex.site";

// Create the auth instance
export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth({
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false, // Enable in production
    },
    plugins: [
      expo(), // Expo plugin for mobile support
      convex({ authConfig }),
      crossDomain({ siteUrl }), // Required for web SPAs on different domains
    ],
    trustedOrigins: [
      "flowday://", // Production deep link (mobile)
      // Web app origins
      "https://flowday.app", // Production web (TODO: update with actual domain)
      // Development-only origins
      ...(isDevelopment
        ? [
            "http://localhost:3000", // Web dev server
            "http://127.0.0.1:3000", // Web dev server (alternative)
            "exp://192.168.*.*:*", // Expo Go development (local network)
            "exp://localhost:*", // Expo Go localhost
          ]
        : []),
    ],
  });
};

// Helper function to get the authenticated user in queries/mutations
export async function getAuthUser(ctx: QueryCtx | MutationCtx) {
  // Use ctx.auth.getUserIdentity() directly - this is the standard Convex way
  // to get the authenticated user's identity from the JWT token
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  // Get full user profile from our users table
  // identity.subject contains the better-auth user ID (same as what ensureUser stores)
  const user = await ctx.db
    .query("users")
    .withIndex("by_auth_user", (q) => q.eq("authUserId", identity.subject))
    .first();

  return user;
}

// Helper to require authentication (throws if not authenticated)
export async function requireAuth(ctx: QueryCtx | MutationCtx) {
  const user = await getAuthUser(ctx);
  if (!user) {
    throw new Error("Not authenticated");
  }
  return user;
}
