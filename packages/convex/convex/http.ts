import { httpRouter } from "convex/server";
import { authComponent, createAuth } from "./auth";

const http = httpRouter();

// Register better-auth routes (includes /.well-known/openid-configuration)
// Enable CORS for cross-domain authentication (required for web SPAs)
authComponent.registerRoutes(http, createAuth, { cors: true });

export default http;
