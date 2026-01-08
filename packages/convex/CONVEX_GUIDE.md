# Convex Quick Reference Guide

## What is Convex?

Convex is a backend-as-a-service that provides:
- **Real-time database** with automatic subscriptions
- **Server functions** (queries, mutations, actions)
- **File storage**
- **Scheduled jobs** (crons)
- **HTTP endpoints**

All your backend code lives in the `convex/` folder and runs on Convex's cloud.

---

## Key Commands

### Development Server
```bash
bunx convex dev
```
- **Runs continuously** - don't stop it while developing
- Watches `convex/` folder for changes
- Auto-syncs code to Convex cloud
- Regenerates TypeScript types in `convex/_generated/`
- Shows real-time logs from your functions

**Keep this running in a dedicated terminal.**

### Environment Variables
```bash
# Set a variable (runs once, doesn't need convex dev)
bunx convex env set VARIABLE_NAME "value"

# List all variables
bunx convex env list

# Remove a variable
bunx convex env remove VARIABLE_NAME
```

Environment variables are stored securely on Convex cloud and available in your server functions via `process.env.VARIABLE_NAME`.

### Deploy to Production
```bash
bunx convex deploy
```
Deploys your functions to production (separate from dev environment).

### Other Useful Commands
```bash
# Open Convex dashboard in browser
bunx convex dashboard

# View logs
bunx convex logs

# Run a function manually
bunx convex run functionName '{"arg": "value"}'

# Import data
bunx convex import --table tableName data.json

# Export data
bunx convex export --table tableName
```

---

## Function Types

### Query (Read-only, Real-time)
```typescript
// convex/myFile.ts
import { query } from "./_generated/server";
import { v } from "convex/values";

export const getItems = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    // ctx.db = database access
    return await ctx.db
      .query("items")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});
```
- **Cannot modify data**
- **Auto-subscribes** - UI updates when data changes
- Called with `useQuery(api.myFile.getItems, { userId })`

### Mutation (Read/Write, Transactional)
```typescript
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const createItem = mutation({
  args: { title: v.string() },
  handler: async (ctx, { title }) => {
    // Insert returns the new document's ID
    const id = await ctx.db.insert("items", {
      title,
      createdAt: Date.now(),
    });
    return id;
  },
});
```
- **Can read and write data**
- **Transactional** - all or nothing
- Called with `useMutation(api.myFile.createItem)`

### Action (External APIs, Non-transactional)
```typescript
import { action } from "./_generated/server";
import { api } from "./_generated/api";

export const callExternalAPI = action({
  args: {},
  handler: async (ctx) => {
    // Can call external APIs
    const response = await fetch("https://api.example.com/data");
    const data = await response.json();

    // Can call mutations/queries
    await ctx.runMutation(api.myFile.createItem, { title: data.title });

    return data;
  },
});
```
- **For external API calls** (fetch, third-party SDKs)
- **Not transactional**
- Can call queries/mutations via `ctx.runQuery()` / `ctx.runMutation()`
- Called with `useAction(api.myFile.callExternalAPI)` or `convex.action()`

### Internal Functions (Not exposed to client)
```typescript
import { internalMutation, internalQuery, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

export const secretOperation = internalMutation({
  args: { ... },
  handler: async (ctx, args) => {
    // Only callable from other server functions
  },
});

// Call from another function:
await ctx.runMutation(internal.myFile.secretOperation, { ... });
```
- **Cannot be called from client**
- Use for sensitive operations
- Called via `internal.` instead of `api.`

---

## Database Operations

### Reading Data
```typescript
// Get single document by ID
const doc = await ctx.db.get(documentId);

// Query with index
const docs = await ctx.db
  .query("tableName")
  .withIndex("indexName", (q) => q.eq("field", value))
  .collect();

// Query with filter (less efficient than index)
const docs = await ctx.db
  .query("tableName")
  .filter((q) => q.eq(q.field("field"), value))
  .collect();

// Get first match
const doc = await ctx.db
  .query("tableName")
  .withIndex("indexName", (q) => q.eq("field", value))
  .first();

// Order results
const docs = await ctx.db
  .query("tableName")
  .order("desc") // or "asc"
  .collect();
```

### Writing Data
```typescript
// Insert new document (returns ID)
const id = await ctx.db.insert("tableName", { field: "value" });

// Update document (partial update)
await ctx.db.patch(documentId, { field: "newValue" });

// Replace document entirely
await ctx.db.replace(documentId, { field: "value", otherField: "value" });

// Delete document
await ctx.db.delete(documentId);
```

---

## Schema Definition

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    age: v.optional(v.number()),
    role: v.union(v.literal("admin"), v.literal("user")),
    tags: v.array(v.string()),
    metadata: v.object({
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
  })
    .index("by_email", ["email"])
    .index("by_role", ["role"]),

  posts: defineTable({
    userId: v.id("users"),  // Reference to users table
    title: v.string(),
    content: v.string(),
  })
    .index("by_user", ["userId"]),
});
```

### Validator Types
- `v.string()` - string
- `v.number()` - number
- `v.boolean()` - boolean
- `v.null()` - null
- `v.id("tableName")` - document ID reference
- `v.array(v.string())` - array of strings
- `v.object({ ... })` - nested object
- `v.optional(v.string())` - optional field
- `v.union(v.literal("a"), v.literal("b"))` - enum-like
- `v.any()` - any type (avoid if possible)

---

## Client-Side Usage (React Native)

```typescript
import { useQuery, useMutation, useAction, useConvex } from "convex/react";
import { api } from "@flow-day/convex/convex/_generated/api";

function MyComponent() {
  // Subscribe to query (auto-updates)
  const items = useQuery(api.items.list, { userId: "123" });
  // items is undefined while loading, then the data

  // Get mutation function
  const createItem = useMutation(api.items.create);

  // Get action function
  const doAction = useAction(api.external.callAPI);

  // Direct convex client (for use in callbacks/tools)
  const convex = useConvex();

  const handleCreate = async () => {
    // Call mutation
    const id = await createItem({ title: "New Item" });

    // Or use convex client directly
    const data = await convex.query(api.items.get, { id });
    await convex.mutation(api.items.update, { id, title: "Updated" });
    await convex.action(api.external.sync, {});
  };

  if (items === undefined) return <Loading />;

  return <ItemList items={items} onCreate={handleCreate} />;
}
```

---

## File Structure

```
packages/convex/
├── convex/
│   ├── _generated/        # Auto-generated (don't edit)
│   │   ├── api.d.ts       # Type-safe API
│   │   ├── api.js
│   │   ├── dataModel.d.ts # Database types
│   │   ├── server.d.ts
│   │   └── server.js
│   ├── schema.ts          # Database schema
│   ├── auth.ts            # Auth helpers
│   ├── http.ts            # HTTP routes
│   ├── users.ts           # User functions
│   ├── blocks.ts          # Block functions
│   └── agent.ts           # Agent functions
├── .env.local             # Local env vars (gitignored)
└── package.json
```

---

## Convex Dashboard

Access at: https://dashboard.convex.dev

Features:
- **Data** - Browse/edit database tables
- **Functions** - View/test your functions
- **Logs** - Real-time function logs
- **Settings** - Environment variables, team, billing

---

## Tips

1. **Always run `convex dev`** during development
2. **Use indexes** for queries - much faster than filters
3. **Mutations are atomic** - if one part fails, nothing changes
4. **Actions for external calls** - can't use fetch in queries/mutations
5. **`internal` functions** for sensitive operations not exposed to clients
6. **Check `_generated/api.ts`** to see available functions with types
