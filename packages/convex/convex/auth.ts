import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth";
import { expo } from "@better-auth/expo";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import authConfig from "./auth.config";

// Create the better-auth component client with triggers for user sync
export const authComponent = createClient<DataModel>(components.betterAuth, {
  triggers: {
    user: {
      onCreate: async (ctx, authUser) => {
        // Automatically create application user profile when auth user signs up
        await ctx.db.insert("users", {
          authUserId: authUser._id,
          email: authUser.email ?? "",
          name: authUser.name ?? undefined,
          onboardingCompleted: false,
          preferences: {
            wakeTime: "07:00",
            sleepTime: "23:00",
            peakEnergyWindow: "morning",
            notificationStyle: "proactive",
            timezone: "UTC", // Default to UTC, client should update during onboarding
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      },
      onUpdate: async (ctx, newDoc, oldDoc) => {
        // Sync email/name changes to application user profile
        if (newDoc.email !== oldDoc.email || newDoc.name !== oldDoc.name) {
          const profile = await ctx.db
            .query("users")
            .withIndex("by_auth_user", (q) => q.eq("authUserId", newDoc._id))
            .first();
          if (profile) {
            await ctx.db.patch(profile._id, {
              email: newDoc.email ?? profile.email,
              name: newDoc.name ?? profile.name,
              updatedAt: Date.now(),
            });
          }
        }
      },
      onDelete: async (ctx, authUser) => {
        // Clean up application user profile when auth user is deleted
        const profile = await ctx.db
          .query("users")
          .withIndex("by_auth_user", (q) => q.eq("authUserId", authUser._id))
          .first();
        if (profile) {
          await ctx.db.delete(profile._id);
        }
      },
    },
  },
});

// Export triggers API (required for triggers to work)
export const { onCreate, onUpdate, onDelete } = authComponent.triggersApi();

// Check if running in development environment
// Set ENVIRONMENT=development on dev deployment, ENVIRONMENT=production on prod deployment
const isDevelopment = process.env.ENVIRONMENT !== "production";

// Get the Convex site URL for crossDomain plugin and baseURL
// This MUST be set as an environment variable in Convex dashboard
// Run: npx convex env set SITE_URL https://your-deployment.convex.site
const siteUrl = process.env.SITE_URL;
if (!siteUrl) {
  // In development, this is a critical error - auth will not work without SITE_URL
  throw new Error(
    "SITE_URL environment variable is required for authentication. " +
    "Set it in the Convex dashboard: npx convex env set SITE_URL https://fearless-iguana-970.convex.site"
  );
}

// Create the auth instance
export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth({
    database: authComponent.adapter(ctx),
    baseURL: siteUrl, // Required for crossDomain plugin and JWT token generation

    // Explicit session configuration for clarity and security
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days - total session lifespan
      updateAge: 60 * 60 * 24, // 1 day - refresh cookie during active use
      freshAge: 60 * 60 * 24, // 1 day - sensitive ops require recent auth
      cookieCache: {
        enabled: true,
        maxAge: 60 * 5, // 5 minutes - balance performance vs revocation delay
      },
    },

    emailAndPassword: {
      enabled: true,
      requireEmailVerification: !isDevelopment,
      minPasswordLength: 8,
    },
    plugins: [
      expo(), // Expo plugin for mobile support
      convex({ authConfig }),
      crossDomain({ siteUrl }), // Required for web SPAs on different domains
    ],
    trustedOrigins: [
      // Mobile
      "flowday://", // Production deep link (mobile)

      // Web - Production
      ...(siteUrl ? [siteUrl] : []),

      // Web - Development
      ...(isDevelopment
        ? [
            "http://localhost:3001", // Web dev server
            "http://localhost:5173", // Vite dev server
            "http://127.0.0.1:3001", // Web dev server (alternative)
            "http://127.0.0.1:5173", // Vite dev server (alternative)
          ]
        : []),

      // Vercel Preview URLs (wildcard)
      "https://*.vercel.app",

      // Expo Development
      ...(isDevelopment
        ? [
            "exp://192.168.*.*:*", // Expo Go development (local network)
            "exp://localhost:*", // Expo Go localhost
          ]
        : []),
    ],
  });
};

// Helper function to get the authenticated user in queries/mutations
export async function getAuthUser(ctx: QueryCtx | MutationCtx) {
  // Use authComponent.safeGetAuthUser which validates the session
  // (ctx.auth.getUserIdentity() does NOT validate the session)
  const authUser = await authComponent.safeGetAuthUser(ctx);
  if (!authUser) return null;

  // Get full user profile from our users table
  // authUser.userId contains the better-auth user ID
  const user = await ctx.db
    .query("users")
    .withIndex("by_auth_user", (q) => q.eq("authUserId", authUser.userId))
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
