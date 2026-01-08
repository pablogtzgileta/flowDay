# FlowDay Implementation Plan

> Comprehensive research and implementation guide for building an AI-first daily planner with voice conversation capabilities.

---

## Project Setup & Tooling

### Package Manager

**Always use Bun** for all package management and script execution:

```bash
# Installing packages
bun add <package>
bun add <package> --cwd apps/mobile

# Running scripts
bun run <script>
bun run --cwd packages/convex dev

# Executing binaries
bunx <command>
bunx expo install <package>
bunx convex dev
```

**Never use npm, npx, yarn, or pnpm** in this project.

### Monorepo Structure

This project uses a **monorepo architecture** with Bun workspaces to share the Convex backend between mobile and future web applications:

```
flow-day/
├── package.json              # Root workspace config
├── bun.lockb                 # Bun lockfile
├── apps/
│   ├── mobile/               # Expo React Native app
│   │   ├── app/              # Expo Router pages
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── stores/
│   │   ├── styles/
│   │   ├── app.json
│   │   └── package.json
│   └── web/                  # Future: Next.js/React web app
│       └── ...
├── packages/
│   └── convex/               # Shared Convex backend
│       ├── convex/           # Convex functions
│       │   ├── schema.ts
│       │   ├── auth.ts
│       │   ├── users.ts
│       │   ├── blocks.ts
│       │   └── _generated/
│       └── package.json
└── IMPLEMENTATION_PLAN.md
```

### Root package.json

```json
{
  "name": "flow-day",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "convex": "bun run --cwd packages/convex dev",
    "mobile": "bun run --cwd apps/mobile start",
    "mobile:ios": "bun run --cwd apps/mobile ios",
    "mobile:android": "bun run --cwd apps/mobile android"
  }
}
```

### packages/convex/package.json

```json
{
  "name": "@flow-day/convex",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "bunx convex dev"
  },
  "dependencies": {
    "convex": "^1.x.x"
  }
}
```

### Importing Convex in Apps

Both mobile and web apps import from the shared Convex package:

```typescript
// In apps/mobile or apps/web
import { api } from "@flow-day/convex/convex/_generated/api";
import { useQuery, useMutation } from "convex/react";

const blocks = useQuery(api.blocks.getByDate, { date: "2025-01-15" });
```

### Initialization Commands

```bash
cd /Users/pablogutierrez/Desktop/projects/flow-day

# Create structure
mkdir -p apps packages/convex

# Init root
bun init -y
# (Edit package.json with workspaces config above)

# Create Expo app
cd apps
bunx create-expo-app@latest mobile --template blank-typescript
cd ..

# Init Convex package
cd packages/convex
bun init -y
# (Edit package.json as shown above)
cd ../..

# Install dependencies from root
bun install

# Mobile dependencies
bun add convex better-auth @better-auth/expo @convex-dev/better-auth react-native-unistyles zustand @shopify/flash-list @react-native-community/netinfo date-fns --cwd apps/mobile

bunx expo install expo-router expo-linking expo-constants expo-status-bar expo-secure-store expo-web-browser --cwd apps/mobile

# Convex package dependencies
bun add convex --cwd packages/convex

# Initialize Convex (creates project, generates types)
cd packages/convex
bunx convex dev
```

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Technology Research Summary](#2-technology-research-summary)
3. [Database Schema Design](#3-database-schema-design)
4. [Convex API Design](#4-convex-api-design)
5. [Authentication with better-auth](#5-authentication-with-better-auth)
6. [ElevenLabs Voice Integration](#6-elevenlabs-voice-integration)
7. [AI Agent Prompt Engineering](#7-ai-agent-prompt-engineering)
8. [Scheduling Algorithm](#8-scheduling-algorithm)
9. [Notifications System](#9-notifications-system)
10. [Google Routes API Integration](#10-google-routes-api-integration)
11. [State Management Strategy](#11-state-management-strategy)
12. [Styling with react-native-unistyles](#12-styling-with-react-native-unistyles)
13. [Performance Optimization](#13-performance-optimization)
14. [Testing Strategy](#14-testing-strategy)
15. [Security Considerations](#15-security-considerations)
16. [Development Phases](#16-development-phases)
17. [Technical Challenges & Solutions](#17-technical-challenges--solutions)

---

## 1. Architecture Overview

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              MOBILE APP (Expo)                               │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐                 │
│  │  Timeline View │  │  Agent Chat    │  │  Routine/      │                 │
│  │  (Today/Tmrw)  │  │  (Voice+Text)  │  │  Settings      │                 │
│  └───────┬────────┘  └───────┬────────┘  └───────┬────────┘                 │
│          │                   │                   │                          │
│          │           ┌───────▼────────┐         │                           │
│          │           │  ElevenLabs    │         │                           │
│          │           │  React Native  │         │                           │
│          │           │  SDK           │         │                           │
│          │           │  - Voice UI    │         │                           │
│          │           │  - Client Tools│         │                           │
│          │           └───────┬────────┘         │                           │
│          │                   │                   │                          │
│  ┌───────▼───────────────────▼───────────────────▼──────┐                   │
│  │              Convex React Client                      │                   │
│  │  - useQuery (real-time subscriptions)                │                   │
│  │  - useMutation (optimistic updates)                  │                   │
│  │  - useAction (external API calls)                    │                   │
│  └──────────────────────────┬───────────────────────────┘                   │
└─────────────────────────────┼───────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────────────────────────┐
│    ELEVENLABS CLOUD     │     │              CONVEX CLOUD                    │
├─────────────────────────┤     ├─────────────────────────────────────────────┤
│ • WebRTC Voice Stream   │     │ Database                                    │
│ • ASR (Speech-to-Text)  │◄───►│ • users, routines, blocks, goals, locations │
│ • Claude Haiku 4.5 LLM  │     │                                             │
│ • TTS (Text-to-Speech)  │     │ Functions                                   │
│ • Turn-taking Logic     │     │ • Queries: getSchedule, getGoals, etc.      │
│                         │     │ • Mutations: createBlock, updateRoutine     │
│ Agent Tools ────────────┼────►│ • Actions: calculateTravelTime             │
│ (client-side calls)     │     │                                             │
└─────────────────────────┘     │ Scheduled Jobs                              │
                                │ • Daily routine population                  │
                                │ • Notification scheduling                   │
                                │ • Weekly review generation                  │
                                │                                             │
                                │ HTTP Endpoints                              │
                                │ • better-auth routes                        │
                                │ • ElevenLabs token generation              │
                                └──────────────────┬──────────────────────────┘
                                                   │
                                                   ▼
                                    ┌─────────────────────────────┐
                                    │    GOOGLE ROUTES API        │
                                    │    (Travel time calc)       │
                                    └─────────────────────────────┘
```

### Data Flow Patterns

**1. Real-time Timeline Updates**
```
User opens app → useQuery(api.blocks.getByDate) → Convex subscription
→ Database change → Automatic UI update (no polling)
```

**2. Voice Conversation Flow**
```
User taps mic → ElevenLabs SDK → WebRTC connection → Voice stream
→ ElevenLabs Cloud (ASR → Claude → TTS) → Client tool call
→ Convex mutation → Database update → Real-time UI update
→ Agent continues conversation
```

**3. Text Conversation Flow**
```
User types message → sendUserMessage() → ElevenLabs agent
→ Same flow as voice (but text-only mode, no audio)
```

---

## 2. Technology Research Summary

### ElevenLabs Conversational AI SDK

**Key Findings:**
- SDK requires Expo (no Expo Go support due to native modules)
- Dependencies: `@elevenlabs/react-native`, `@livekit/react-native`, `@livekit/react-native-webrtc`, `livekit-client`
- Supports both WebRTC (recommended) and WebSocket connections
- Text-only mode available via `textOnly: true` option
- Client-side tools enable agent → app actions

**useConversation Hook API:**
```typescript
const conversation = useConversation({
  clientTools: { /* tool definitions */ },
  overrides: { /* dynamic settings */ },
  textOnly: false,
  onMessage: ({ message, source }) => { /* handle messages */ },
  onConnect: ({ conversationId }) => { /* connection established */ },
  onDisconnect: () => { /* cleanup */ },
  onError: (error) => { /* error handling */ },
  onModeChange: ({ mode }) => { /* speaking/listening */ },
});

// Methods
await conversation.startSession({ agentId, connectionType: 'webrtc' });
await conversation.endSession();
conversation.sendUserMessage(text); // For text input
conversation.sendContextualUpdate(context); // Inject context without response
```

**Dynamic Variables (Critical for Context):**
- Syntax: `{{variable_name}}` in system prompt
- Pass via `startSession({ dynamicVariables: { ... } })`
- System variables available: `system__time_utc`, `system__conversation_id`, etc.
- Tool results can update variables at runtime

### Convex Best Practices

**Key Findings:**
- React Native uses same library as React web
- Automatic real-time subscriptions via `useQuery`
- Mutations are transactional and atomic
- Actions for external API calls (Google Routes)
- Scheduled functions for crons and delayed tasks

**Query/Mutation Pattern:**
```typescript
// Query - automatically subscribes to updates
export const getByDate = query({
  args: { date: v.string(), userId: v.id("users") },
  handler: async (ctx, { date, userId }) => {
    return await ctx.db
      .query("blocks")
      .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", date))
      .collect();
  },
});

// Mutation - transactional, optimistic updates supported
export const create = mutation({
  args: { /* ... */ },
  handler: async (ctx, args) => {
    return await ctx.db.insert("blocks", args);
  },
});
```

### better-auth + Convex Integration

**Key Findings:**
- Requires `@convex-dev/better-auth` package
- Uses Convex component system (convex.config.ts)
- HTTP routes registered via `authComponent.registerRoutes()`
- Token verification in Convex functions via `authComponent.getAuthUser(ctx)`

**Critical Setup Files:**
1. `convex/convex.config.ts` - Register better-auth component
2. `convex/auth.ts` - Create auth instance with Convex adapter
3. `convex/http.ts` - Register auth HTTP routes
4. `lib/auth-client.ts` - Client-side auth setup

### react-native-unistyles v3

**Key Findings:**
- Requires React Native 0.78+ with New Architecture (Fabric)
- No Provider needed - replaces StyleSheet directly
- Must call `StyleSheet.configure()` before any `StyleSheet.create()`
- Supports adaptive themes (light/dark) automatically

**Setup:**
```typescript
// unistyles.ts
import { StyleSheet } from 'react-native-unistyles';

const themes = {
  light: { colors: { primary: '#007AFF', ... } },
  dark: { colors: { primary: '#0A84FF', ... } },
};

const breakpoints = { xs: 0, sm: 380, md: 768 };

StyleSheet.configure({
  themes,
  breakpoints,
  settings: { adaptiveThemes: true },
});

// TypeScript declaration
declare module 'react-native-unistyles' {
  export interface UnistylesThemes { light: typeof themes.light; dark: typeof themes.dark; }
}
```

### Google Routes API

**Key Findings:**
- `computeRouteMatrix` endpoint for multiple origin/destination pairs
- Returns travel time and distance for each pair
- Supports traffic-aware routing with `TRAFFIC_AWARE` preference
- Max 625 elements per request (origins × destinations)
- Requires API key via `X-Goog-Api-Key` header

---

## 3. Database Schema Design

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // User profile and preferences
  users: defineTable({
    // Auth reference (from better-auth)
    authUserId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),

    // Onboarding state
    onboardingCompleted: v.boolean(),
    onboardingStep: v.optional(v.string()),

    // Preferences (learned during onboarding)
    preferences: v.object({
      wakeTime: v.string(),           // "06:30"
      sleepTime: v.string(),          // "23:00"
      peakEnergyWindow: v.union(
        v.literal("morning"),
        v.literal("afternoon"),
        v.literal("evening")
      ),
      notificationStyle: v.union(
        v.literal("minimal"),
        v.literal("proactive")
      ),
      timezone: v.string(),           // "America/New_York"
    }),

    // Voice usage tracking (for ElevenLabs quota)
    voiceUsage: v.optional(v.object({
      monthlyMinutesUsed: v.number(),
      monthStart: v.string(),         // "2025-01" format
      conversationCount: v.number(),
    })),

    // Rate limiting for token generation (improved structure)
    // Uses sliding window counter instead of storing all timestamps
    tokenRateLimit: v.optional(v.object({
      count: v.number(),              // Requests in current window
      windowStart: v.number(),        // Start of current window (timestamp)
    })),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_auth_user", ["authUserId"])
    .index("by_email", ["email"]),

  // Saved locations for travel time calculations
  locations: defineTable({
    userId: v.id("users"),
    label: v.string(),                // "Home", "Office", "Gym"
    address: v.string(),
    coordinates: v.object({
      lat: v.number(),
      lng: v.number(),
    }),
    keywords: v.array(v.string()),    // ["work", "office"] for AI recognition
    isDefault: v.optional(v.boolean()), // Mark home/primary location
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_label", ["userId", "label"]),

  // Weekly routine template (baseline week)
  routines: defineTable({
    userId: v.id("users"),
    dayOfWeek: v.union(
      v.literal("mon"), v.literal("tue"), v.literal("wed"),
      v.literal("thu"), v.literal("fri"), v.literal("sat"), v.literal("sun")
    ),
    startTime: v.string(),            // "08:00"
    endTime: v.string(),              // "17:00"
    label: v.string(),                // "Work", "Commute", "Gym"
    locationId: v.optional(v.id("locations")),
    flexibility: v.union(
      v.literal("fixed"),             // Cannot be moved (work, meetings)
      v.literal("semi-flexible"),     // Prefer this time but can adjust
      v.literal("free")               // Available slot marker
    ),
    isRecurring: v.boolean(),
    color: v.optional(v.string()),    // For UI display
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_day", ["userId", "dayOfWeek"]),

  // Actual scheduled blocks for specific dates
  blocks: defineTable({
    userId: v.id("users"),
    date: v.string(),                 // "2025-01-15"
    startTime: v.string(),            // "06:30"
    endTime: v.string(),              // "07:30"
    title: v.string(),
    description: v.optional(v.string()),

    // Source and status
    source: v.union(
      v.literal("routine"),           // Auto-generated from routine
      v.literal("user_request"),      // User explicitly asked
      v.literal("ai_suggestion"),     // AI proactively suggested
      v.literal("goal_session")       // Scheduled for goal progress
    ),
    status: v.union(
      v.literal("planned"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("skipped"),
      v.literal("moved")
    ),

    // Location and travel
    requiresTravel: v.boolean(),
    locationId: v.optional(v.id("locations")),
    estimatedTravelTime: v.optional(v.number()), // minutes
    prepBuffer: v.number(),           // minutes before leaving

    // Notification tracking
    notifyAt: v.optional(v.number()), // timestamp
    notificationId: v.optional(v.string()), // expo notification ID

    // Goal association
    goalId: v.optional(v.id("goals")),

    // Rescheduling tracking
    routineId: v.optional(v.id("routines")), // If generated from routine
    originalDate: v.optional(v.string()),
    timesPostponed: v.number(),

    // Energy and preferences
    energyLevel: v.optional(v.union(
      v.literal("high"),
      v.literal("medium"),
      v.literal("low")
    )),

    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "date"])
    .index("by_user_status", ["userId", "status"])
    .index("by_goal", ["goalId"])
    .index("by_notify_time", ["notifyAt"]),

  // Goals and habits with time targets
  goals: defineTable({
    userId: v.id("users"),
    title: v.string(),                // "Learn React Native"
    description: v.optional(v.string()),

    // Time targets
    weeklyTargetMinutes: v.number(),  // 300 = 5 hours
    preferredSessionLength: v.object({
      min: v.number(),                // 30 minutes
      max: v.number(),                // 45 minutes
    }),

    // Scheduling preferences
    preferredTime: v.union(
      v.literal("morning"),
      v.literal("afternoon"),
      v.literal("evening"),
      v.literal("any")
    ),
    energyLevel: v.union(
      v.literal("high"),
      v.literal("medium"),
      v.literal("low")
    ),

    // Priority and categorization
    priority: v.number(),             // 1 = highest
    category: v.union(
      v.literal("learning"),
      v.literal("health"),
      v.literal("career"),
      v.literal("personal"),
      v.literal("creative")
    ),

    // Status
    isActive: v.boolean(),
    targetDate: v.optional(v.number()), // Optional deadline

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_active", ["userId", "isActive"])
    .index("by_user_priority", ["userId", "priority"]),

  // Weekly progress tracking for goals
  goalProgress: defineTable({
    goalId: v.id("goals"),
    userId: v.id("users"),
    weekStartDate: v.string(),        // "2025-01-13" (Monday)
    targetMinutes: v.number(),
    completedMinutes: v.number(),
    sessionsPlanned: v.number(),
    sessionsCompleted: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_goal_week", ["goalId", "weekStartDate"])
    .index("by_user_week", ["userId", "weekStartDate"]),

  // Task templates for common activities
  taskTemplates: defineTable({
    userId: v.id("users"),
    name: v.string(),                 // "Gym Session"
    defaultDuration: v.number(),      // 60 minutes
    preferredTime: v.union(
      v.literal("morning"),
      v.literal("afternoon"),
      v.literal("evening"),
      v.literal("any")
    ),
    energyLevel: v.union(
      v.literal("high"),
      v.literal("medium"),
      v.literal("low")
    ),
    locationId: v.optional(v.id("locations")),
    prepBuffer: v.number(),           // minutes needed before
    keywords: v.array(v.string()),    // For AI recognition
    createdAt: v.number(),
  })
    .index("by_user", ["userId"]),

  // Conversation history for context (optional)
  conversations: defineTable({
    userId: v.id("users"),
    elevenLabsConversationId: v.string(),
    summary: v.optional(v.string()),  // AI-generated summary
    messagesCount: v.number(),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_elevenlabs_id", ["elevenLabsConversationId"]),

  // Travel time cache to reduce API calls
  travelTimeCache: defineTable({
    fromLocationId: v.id("locations"),
    toLocationId: v.id("locations"),
    travelTimeMinutes: v.number(),
    calculatedAt: v.number(),
    // Traffic conditions at calculation time
    trafficCondition: v.optional(v.union(
      v.literal("light"),
      v.literal("moderate"),
      v.literal("heavy")
    )),
  })
    .index("by_locations", ["fromLocationId", "toLocationId"]),

  // Weekly reviews (V2 feature)
  weeklyReviews: defineTable({
    userId: v.id("users"),
    weekStartDate: v.string(),
    completedBlocks: v.number(),
    skippedBlocks: v.number(),
    rescheduledCount: v.number(),
    insights: v.array(v.object({
      type: v.string(),
      message: v.string(),
      suggestion: v.optional(v.string()),
    })),
    generatedAt: v.number(),
  })
    .index("by_user_week", ["userId", "weekStartDate"]),
});
```

---

## 4. Convex API Design

### Queries

```typescript
// convex/blocks.ts
import { query } from "./_generated/server";
import { v } from "convex/values";

// Get blocks for a specific date
export const getByDate = query({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const user = await getAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const blocks = await ctx.db
      .query("blocks")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", user._id).eq("date", date)
      )
      .collect();

    // Sort by start time
    return blocks.sort((a, b) => a.startTime.localeCompare(b.startTime));
  },
});

// Get blocks for date range (week view)
export const getByDateRange = query({
  args: {
    startDate: v.string(),
    endDate: v.string()
  },
  handler: async (ctx, { startDate, endDate }) => {
    const user = await getAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    // Get all user blocks and filter by date range
    const blocks = await ctx.db
      .query("blocks")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    return blocks
      .filter((b) => b.date >= startDate && b.date <= endDate)
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.startTime.localeCompare(b.startTime);
      });
  },
});

// Get today's summary for agent context
export const getTodaySummary = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const today = new Date().toISOString().split("T")[0];
    const blocks = await ctx.db
      .query("blocks")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", user._id).eq("date", today)
      )
      .collect();

    const completed = blocks.filter((b) => b.status === "completed").length;
    const planned = blocks.filter((b) => b.status === "planned").length;
    const inProgress = blocks.filter((b) => b.status === "in_progress").length;

    return {
      date: today,
      totalBlocks: blocks.length,
      completed,
      planned,
      inProgress,
      blocks: blocks.sort((a, b) => a.startTime.localeCompare(b.startTime)),
    };
  },
});
```

```typescript
// convex/goals.ts
import { query } from "./_generated/server";

// Get goals with weekly progress
export const getWithProgress = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const goals = await ctx.db
      .query("goals")
      .withIndex("by_user_active", (q) =>
        q.eq("userId", user._id).eq("isActive", true)
      )
      .collect();

    // Get current week's progress
    const weekStart = getWeekStart(new Date());
    const progressRecords = await Promise.all(
      goals.map(async (goal) => {
        const progress = await ctx.db
          .query("goalProgress")
          .withIndex("by_goal_week", (q) =>
            q.eq("goalId", goal._id).eq("weekStartDate", weekStart)
          )
          .first();

        return {
          ...goal,
          weeklyProgress: progress || {
            completedMinutes: 0,
            targetMinutes: goal.weeklyTargetMinutes,
            sessionsCompleted: 0,
            sessionsPlanned: 0,
          },
          remainingMinutes: goal.weeklyTargetMinutes - (progress?.completedMinutes || 0),
        };
      })
    );

    return progressRecords.sort((a, b) => a.priority - b.priority);
  },
});
```

```typescript
// convex/routines.ts
import { query } from "./_generated/server";

// Get user's routine template
export const getTemplate = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const routines = await ctx.db
      .query("routines")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Group by day
    const byDay = routines.reduce((acc, r) => {
      if (!acc[r.dayOfWeek]) acc[r.dayOfWeek] = [];
      acc[r.dayOfWeek].push(r);
      return acc;
    }, {} as Record<string, typeof routines>);

    // Sort each day's routines by start time
    Object.keys(byDay).forEach((day) => {
      byDay[day].sort((a, b) => a.startTime.localeCompare(b.startTime));
    });

    return byDay;
  },
});
```

### Mutations

```typescript
// convex/blocks.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Time validation and conversion utilities
function validateTimeFormat(time: string): boolean {
  const regex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return regex.test(time);
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function validateDateFormat(date: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(date)) return false;
  const parsed = new Date(date);
  return !isNaN(parsed.getTime());
}

// Check if two time ranges overlap
function timesOverlap(
  aStart: number, aEnd: number,
  bStart: number, bEnd: number
): boolean {
  return aStart < bEnd && aEnd > bStart;
}

// Create a new block with validation and conflict detection
export const create = mutation({
  args: {
    date: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    source: v.union(
      v.literal("routine"),
      v.literal("user_request"),
      v.literal("ai_suggestion"),
      v.literal("goal_session")
    ),
    requiresTravel: v.boolean(),
    locationId: v.optional(v.id("locations")),
    goalId: v.optional(v.id("goals")),
    energyLevel: v.optional(v.union(
      v.literal("high"),
      v.literal("medium"),
      v.literal("low")
    )),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    // ===== INPUT VALIDATION =====
    if (!validateDateFormat(args.date)) {
      throw new Error("Invalid date format. Use YYYY-MM-DD");
    }

    if (!validateTimeFormat(args.startTime) || !validateTimeFormat(args.endTime)) {
      throw new Error("Invalid time format. Use HH:MM (24-hour)");
    }

    const startMinutes = timeToMinutes(args.startTime);
    const endMinutes = timeToMinutes(args.endTime);

    if (startMinutes >= endMinutes) {
      throw new Error("End time must be after start time");
    }

    if (args.title.trim().length === 0) {
      throw new Error("Title cannot be empty");
    }

    if (args.title.length > 100) {
      throw new Error("Title must be 100 characters or less");
    }

    // ===== CONFLICT DETECTION =====
    const existingBlocks = await ctx.db
      .query("blocks")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", user._id).eq("date", args.date)
      )
      .collect();

    // Check for conflicts (excluding moved/skipped blocks)
    const activeBlocks = existingBlocks.filter(
      b => b.status !== "moved" && b.status !== "skipped"
    );

    for (const block of activeBlocks) {
      const blockStart = timeToMinutes(block.startTime);
      const blockEnd = timeToMinutes(block.endTime);

      if (timesOverlap(startMinutes, endMinutes, blockStart, blockEnd)) {
        throw new Error(
          `Conflicts with "${block.title}" (${block.startTime}-${block.endTime})`
        );
      }
    }

    // ===== CREATE BLOCK =====
    const now = Date.now();

    // Calculate travel time if location specified
    let estimatedTravelTime: number | undefined;
    if (args.requiresTravel && args.locationId) {
      // Get user's current/home location
      const homeLocation = await ctx.db
        .query("locations")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .filter((q) => q.eq(q.field("isDefault"), true))
        .first();

      if (homeLocation) {
        const cached = await ctx.db
          .query("travelTimeCache")
          .withIndex("by_locations", (q) =>
            q.eq("fromLocationId", homeLocation._id).eq("toLocationId", args.locationId!)
          )
          .first();

        if (cached && now - cached.calculatedAt < 24 * 60 * 60 * 1000) {
          estimatedTravelTime = cached.travelTimeMinutes;
        }
        // Otherwise, schedule travel time calculation via action
      }
    }

    const blockId = await ctx.db.insert("blocks", {
      ...args,
      title: args.title.trim(),
      userId: user._id,
      status: "planned",
      estimatedTravelTime,
      prepBuffer: args.requiresTravel ? 10 : 0, // Default 10 min prep for travel
      timesPostponed: 0,
      createdAt: now,
      updatedAt: now,
    });

    return blockId;
  },
});

// Delete a block
export const deleteBlock = mutation({
  args: {
    blockId: v.id("blocks"),
  },
  handler: async (ctx, { blockId }) => {
    const user = await getAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const block = await ctx.db.get(blockId);
    if (!block || block.userId !== user._id) {
      throw new Error("Block not found");
    }

    // Note: Notification cancellation must be handled client-side
    // since we can't call expo-notifications from Convex
    const notificationId = block.notificationId;

    await ctx.db.delete(blockId);

    // Return notification ID so client can cancel it
    return { deletedBlockId: blockId, notificationId };
  },
});

// Update block status
export const updateStatus = mutation({
  args: {
    blockId: v.id("blocks"),
    status: v.union(
      v.literal("planned"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("skipped"),
      v.literal("moved")
    ),
  },
  handler: async (ctx, { blockId, status }) => {
    const user = await getAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const block = await ctx.db.get(blockId);
    if (!block || block.userId !== user._id) {
      throw new Error("Block not found");
    }

    const updates: Partial<typeof block> = {
      status,
      updatedAt: Date.now(),
    };

    if (status === "completed") {
      updates.completedAt = Date.now();

      // Update goal progress if associated with a goal
      if (block.goalId) {
        await updateGoalProgress(ctx, block);
      }
    }

    await ctx.db.patch(blockId, updates);
  },
});

// Update block details (title, description, times, energy level)
export const update = mutation({
  args: {
    blockId: v.id("blocks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    energyLevel: v.optional(v.union(
      v.literal("high"),
      v.literal("medium"),
      v.literal("low")
    )),
    requiresTravel: v.optional(v.boolean()),
    locationId: v.optional(v.id("locations")),
  },
  handler: async (ctx, { blockId, ...updates }) => {
    const user = await getAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const block = await ctx.db.get(blockId);
    if (!block || block.userId !== user._id) {
      throw new Error("Block not found");
    }

    // Validate title if provided
    if (updates.title !== undefined) {
      if (updates.title.trim().length === 0) {
        throw new Error("Title cannot be empty");
      }
      if (updates.title.length > 100) {
        throw new Error("Title must be 100 characters or less");
      }
    }

    // Validate times if provided
    if (updates.startTime && !validateTimeFormat(updates.startTime)) {
      throw new Error("Invalid start time format. Use HH:MM (24-hour)");
    }
    if (updates.endTime && !validateTimeFormat(updates.endTime)) {
      throw new Error("Invalid end time format. Use HH:MM (24-hour)");
    }

    // If times are changing, check for conflicts
    const newStartTime = updates.startTime || block.startTime;
    const newEndTime = updates.endTime || block.endTime;

    if (updates.startTime || updates.endTime) {
      const startMinutes = timeToMinutes(newStartTime);
      const endMinutes = timeToMinutes(newEndTime);

      if (startMinutes >= endMinutes) {
        throw new Error("End time must be after start time");
      }

      // Check for conflicts with other blocks (excluding this block)
      const existingBlocks = await ctx.db
        .query("blocks")
        .withIndex("by_user_date", (q) =>
          q.eq("userId", user._id).eq("date", block.date)
        )
        .collect();

      const activeBlocks = existingBlocks.filter(
        b => b._id !== blockId && b.status !== "moved" && b.status !== "skipped"
      );

      for (const otherBlock of activeBlocks) {
        const blockStart = timeToMinutes(otherBlock.startTime);
        const blockEnd = timeToMinutes(otherBlock.endTime);

        if (timesOverlap(startMinutes, endMinutes, blockStart, blockEnd)) {
          throw new Error(
            `Conflicts with "${otherBlock.title}" (${otherBlock.startTime}-${otherBlock.endTime})`
          );
        }
      }
    }

    // Build update object with only defined values
    const updateData: Record<string, any> = { updatedAt: Date.now() };

    if (updates.title !== undefined) updateData.title = updates.title.trim();
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.startTime !== undefined) updateData.startTime = updates.startTime;
    if (updates.endTime !== undefined) updateData.endTime = updates.endTime;
    if (updates.energyLevel !== undefined) updateData.energyLevel = updates.energyLevel;
    if (updates.requiresTravel !== undefined) updateData.requiresTravel = updates.requiresTravel;
    if (updates.locationId !== undefined) updateData.locationId = updates.locationId;

    await ctx.db.patch(blockId, updateData);

    return blockId;
  },
});

// Reschedule block to new time/date
export const reschedule = mutation({
  args: {
    blockId: v.id("blocks"),
    newDate: v.string(),
    newStartTime: v.string(),
    newEndTime: v.string(),
  },
  handler: async (ctx, { blockId, newDate, newStartTime, newEndTime }) => {
    const user = await getAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const block = await ctx.db.get(blockId);
    if (!block || block.userId !== user._id) {
      throw new Error("Block not found");
    }

    await ctx.db.patch(blockId, {
      date: newDate,
      startTime: newStartTime,
      endTime: newEndTime,
      originalDate: block.originalDate || block.date,
      timesPostponed: block.timesPostponed + 1,
      status: "planned",
      updatedAt: Date.now(),
    });
  },
});
```

```typescript
// convex/users.ts
import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUser } from "./auth";

// Ensure user document exists after authentication
// Call this after successful sign-in/sign-up
export const ensureUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_auth_user", (q) => q.eq("authUserId", identity.subject))
      .first();

    if (existingUser) {
      return existingUser._id;
    }

    // Get timezone from client or use default
    const defaultTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Create new user with defaults
    const userId = await ctx.db.insert("users", {
      authUserId: identity.subject,
      email: identity.email || "",
      name: identity.name || undefined,
      onboardingCompleted: false,
      preferences: {
        wakeTime: "07:00",
        sleepTime: "23:00",
        peakEnergyWindow: "morning",
        notificationStyle: "proactive",
        timezone: defaultTimezone,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return userId;
  },
});

// Get current user (for client)
export const getCurrent = query({
  args: {},
  handler: async (ctx) => {
    return await getAuthUser(ctx);
  },
});

// Internal: Get current user by auth ID (for actions)
export const getByAuthId = internalMutation({
  args: { authId: v.string() },
  handler: async (ctx, { authId }) => {
    return await ctx.db
      .query("users")
      .withIndex("by_auth_user", (q) => q.eq("authUserId", authId))
      .first();
  },
});

// Update user preferences (from onboarding)
export const updatePreferences = mutation({
  args: {
    wakeTime: v.optional(v.string()),
    sleepTime: v.optional(v.string()),
    peakEnergyWindow: v.optional(v.union(
      v.literal("morning"),
      v.literal("afternoon"),
      v.literal("evening")
    )),
    timezone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const currentPrefs = user.preferences;
    await ctx.db.patch(user._id, {
      preferences: {
        ...currentPrefs,
        ...Object.fromEntries(
          Object.entries(args).filter(([_, v]) => v !== undefined)
        ),
      },
      updatedAt: Date.now(),
    });
  },
});

// Complete onboarding
export const completeOnboarding = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    await ctx.db.patch(user._id, {
      onboardingCompleted: true,
      updatedAt: Date.now(),
    });
  },
});
```

### Actions

```typescript
// convex/maps.ts
import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Calculate travel time using Google Routes API
export const calculateTravelTime = action({
  args: {
    fromLocationId: v.id("locations"),
    toLocationId: v.id("locations"),
  },
  handler: async (ctx, { fromLocationId, toLocationId }) => {
    // Get locations from database
    const [fromLocation, toLocation] = await Promise.all([
      ctx.runQuery(internal.locations.getById, { id: fromLocationId }),
      ctx.runQuery(internal.locations.getById, { id: toLocationId }),
    ]);

    if (!fromLocation || !toLocation) {
      throw new Error("Location not found");
    }

    // Call Google Routes API
    const response = await fetch(
      "https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": process.env.GOOGLE_ROUTES_API_KEY!,
          "X-Goog-FieldMask": "originIndex,destinationIndex,duration,distanceMeters,condition",
        },
        body: JSON.stringify({
          origins: [{
            waypoint: {
              location: {
                latLng: {
                  latitude: fromLocation.coordinates.lat,
                  longitude: fromLocation.coordinates.lng,
                },
              },
            },
          }],
          destinations: [{
            waypoint: {
              location: {
                latLng: {
                  latitude: toLocation.coordinates.lat,
                  longitude: toLocation.coordinates.lng,
                },
              },
            },
          }],
          travelMode: "DRIVE",
          routingPreference: "TRAFFIC_AWARE",
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Routes API error: ${response.status}`);
    }

    const data = await response.json();
    const result = data[0];

    if (result.condition !== "ROUTE_EXISTS") {
      throw new Error("Could not calculate route");
    }

    // Parse duration (e.g., "1234s" -> 20.57 minutes)
    const durationSeconds = parseInt(result.duration.replace("s", ""));
    const travelTimeMinutes = Math.ceil(durationSeconds / 60);

    // Cache the result
    await ctx.runMutation(internal.travelTimeCache.upsert, {
      fromLocationId,
      toLocationId,
      travelTimeMinutes,
    });

    return travelTimeMinutes;
  },
});
```

```typescript
// convex/agent.ts
import { action, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_TOKENS_PER_WINDOW = 3;

// Generate conversation token for ElevenLabs (with rate limiting)
export const getConversationToken = action({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Get user and check rate limit
    const user = await ctx.runQuery(internal.users.getByAuthIdQuery, {
      authId: identity.subject,
    });

    if (!user) throw new Error("User not found");

    // Check rate limiting using sliding window counter
    const now = Date.now();
    const rateLimit = user.tokenRateLimit;

    if (rateLimit) {
      const windowExpired = now - rateLimit.windowStart >= RATE_LIMIT_WINDOW_MS;

      if (!windowExpired && rateLimit.count >= MAX_TOKENS_PER_WINDOW) {
        const waitSeconds = Math.ceil(
          (rateLimit.windowStart + RATE_LIMIT_WINDOW_MS - now) / 1000
        );
        throw new Error(
          `Rate limit exceeded. Please wait ${waitSeconds} seconds before starting another conversation.`
        );
      }
    }

    // Update rate limit tracking
    await ctx.runMutation(internal.agent.updateTokenRateLimit, {
      userId: user._id,
      timestamp: now,
    });

    // Generate token from ElevenLabs
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${process.env.ELEVENLABS_AGENT_ID}`,
      {
        headers: {
          "xi-api-key": process.env.ELEVENLABS_API_KEY!,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const { token } = await response.json();
    return token;
  },
});

// Internal: Update rate limit tracking (improved sliding window)
export const updateTokenRateLimit = internalMutation({
  args: {
    userId: v.id("users"),
    timestamp: v.number(),
  },
  handler: async (ctx, { userId, timestamp }) => {
    const user = await ctx.db.get(userId);
    if (!user) return;

    const rateLimit = user.tokenRateLimit;
    const windowExpired = !rateLimit ||
      (timestamp - rateLimit.windowStart >= RATE_LIMIT_WINDOW_MS);

    if (windowExpired) {
      // Start a new window
      await ctx.db.patch(userId, {
        tokenRateLimit: {
          count: 1,
          windowStart: timestamp,
        },
      });
    } else {
      // Increment counter in current window
      await ctx.db.patch(userId, {
        tokenRateLimit: {
          count: rateLimit.count + 1,
          windowStart: rateLimit.windowStart,
        },
      });
    }
  },
});

// Build agent context (user data for dynamic variables)
// IMPORTANT: ElevenLabs dynamic variables only support strings, numbers, booleans
// Do NOT pass objects or arrays - format as concise strings to avoid size limits
export const getAgentContext = action({
  args: {},
  handler: async (ctx) => {
    const user = await ctx.runQuery(internal.users.getCurrent, {});
    if (!user) throw new Error("Not authenticated");

    // Use timezone-aware date calculation
    const { today, tomorrow } = getDatesInTimezone(user.preferences.timezone);

    // Fetch all context data in parallel
    const [todayBlocks, tomorrowBlocks, goals, locations] = await Promise.all([
      ctx.runQuery(internal.blocks.getByDate, { date: today, userId: user._id }),
      ctx.runQuery(internal.blocks.getByDate, { date: tomorrow, userId: user._id }),
      ctx.runQuery(internal.goals.getWithProgress, { userId: user._id }),
      ctx.runQuery(internal.locations.getByUser, { userId: user._id }),
    ]);

    // Format for agent consumption - use simple strings, not JSON
    // This avoids size limits and makes it easier for the LLM to parse
    return {
      // Strings
      user_name: user.name || "there",
      wake_time: user.preferences.wakeTime,
      sleep_time: user.preferences.sleepTime,
      peak_energy: user.preferences.peakEnergyWindow,
      timezone: user.preferences.timezone,
      today_date: today,
      tomorrow_date: tomorrow,
      // Formatted schedule strings (not JSON)
      today_schedule: formatScheduleForAgent(todayBlocks),
      tomorrow_schedule: formatScheduleForAgent(tomorrowBlocks),
      goals_summary: formatGoalsForAgent(goals),
      locations_list: locations.map(l => l.label).join(", "),
      // Numbers
      today_block_count: todayBlocks.length,
      tomorrow_block_count: tomorrowBlocks.length,
      active_goals_count: goals.length,
      // Booleans
      has_goals: goals.length > 0,
    };
  },
});

// Helper: Format date as YYYY-MM-DD (cross-environment safe)
// Note: 'en-CA' locale trick is not spec-guaranteed, so we use Intl.DateTimeFormat
function formatDateYYYYMMDD(date: Date, timezone: string): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(date);
  const year = parts.find(p => p.type === 'year')!.value;
  const month = parts.find(p => p.type === 'month')!.value;
  const day = parts.find(p => p.type === 'day')!.value;

  return `${year}-${month}-${day}`;
}

// Helper: Get dates in user's timezone
function getDatesInTimezone(timezone: string): { today: string; tomorrow: string } {
  const now = new Date();

  // Get today in user's timezone (YYYY-MM-DD format)
  const today = formatDateYYYYMMDD(now, timezone);

  // Get tomorrow
  const tomorrowDate = new Date(now);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = formatDateYYYYMMDD(tomorrowDate, timezone);

  return { today, tomorrow };
}

// Helper: Format blocks as concise string for agent
function formatScheduleForAgent(blocks: any[]): string {
  if (!blocks || blocks.length === 0) {
    return "No blocks scheduled";
  }

  // Sort by start time
  const sorted = [...blocks].sort((a, b) => a.startTime.localeCompare(b.startTime));

  // Format: "09:00-10:00 Work (planned); 14:00-15:00 Gym (planned)"
  return sorted.map(b =>
    `${b.startTime}-${b.endTime} ${b.title} (${b.status})`
  ).join("; ");
}

// Helper: Format goals as concise string for agent
function formatGoalsForAgent(goals: any[]): string {
  if (!goals || goals.length === 0) {
    return "No active goals";
  }

  // Format: "React Native: 2h/5h this week; Reading: 1h/3h this week"
  return goals.map(g => {
    const completed = Math.round((g.weeklyProgress?.completedMinutes || 0) / 60);
    const target = Math.round(g.weeklyTargetMinutes / 60);
    return `${g.title}: ${completed}h/${target}h this week`;
  }).join("; ");
}
```

### Scheduled Jobs (Crons)

```typescript
// convex/crons.ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Populate routine blocks at midnight for the next day
crons.daily(
  "populate-daily-routine",
  { hourUTC: 5, minuteUTC: 0 }, // 5 AM UTC (adjust for timezone)
  internal.scheduler.populateDailyRoutine
);

// Calculate and schedule notifications
crons.interval(
  "schedule-notifications",
  { minutes: 15 },
  internal.scheduler.updateNotifications
);

// Generate weekly review on Sundays
crons.weekly(
  "weekly-review",
  { dayOfWeek: "sunday", hourUTC: 20, minuteUTC: 0 },
  internal.scheduler.generateWeeklyReview
);

// Clean up old travel time cache
crons.daily(
  "cleanup-travel-cache",
  { hourUTC: 3, minuteUTC: 0 },
  internal.scheduler.cleanupTravelCache
);

export default crons;
```

```typescript
// convex/scheduler.ts
import { internalMutation, internalAction } from "./_generated/server";

// Populate routine blocks for the next day
export const populateDailyRoutine = internalMutation({
  args: {},
  handler: async (ctx) => {
    const tomorrow = new Date(Date.now() + 86400000);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];
    const dayOfWeek = getDayOfWeek(tomorrow); // "mon", "tue", etc.

    // Get all users
    const users = await ctx.db.query("users").collect();

    for (const user of users) {
      if (!user.onboardingCompleted) continue;

      // Get user's routine for this day
      const routines = await ctx.db
        .query("routines")
        .withIndex("by_user_day", (q) =>
          q.eq("userId", user._id).eq("dayOfWeek", dayOfWeek)
        )
        .collect();

      // Check if blocks already exist for tomorrow
      const existingBlocks = await ctx.db
        .query("blocks")
        .withIndex("by_user_date", (q) =>
          q.eq("userId", user._id).eq("date", tomorrowStr)
        )
        .collect();

      const existingTitles = new Set(existingBlocks.map(b => b.title));

      // Create blocks for routines that don't exist yet
      for (const routine of routines) {
        if (existingTitles.has(routine.label)) continue;

        await ctx.db.insert("blocks", {
          userId: user._id,
          date: tomorrowStr,
          startTime: routine.startTime,
          endTime: routine.endTime,
          title: routine.label,
          source: "routine",
          status: "planned",
          requiresTravel: !!routine.locationId,
          locationId: routine.locationId,
          routineId: routine._id,
          prepBuffer: routine.locationId ? 10 : 0,
          timesPostponed: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    }
  },
});
```

---

## 5. Authentication with better-auth

### Setup Files

**1. Convex Component Registration**
```typescript
// convex/convex.config.ts
import { defineApp } from "convex/server";
import betterAuth from "@convex-dev/better-auth/convex.config";

const app = defineApp();
app.use(betterAuth);

export default app;
```

**2. Auth Configuration**
```typescript
// convex/auth.config.ts
export default {
  providers: [{
    domain: process.env.CONVEX_SITE_URL,
    applicationID: "convex",
  }],
};
```

**3. Auth Instance**
```typescript
// convex/auth.ts
import { createClient } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth";
import { components } from "./_generated/api";
import { query } from "./_generated/server";

export const authComponent = createClient(components.betterAuth);

export const createAuth = (ctx: any, options = { optionsOnly: false }) => {
  return betterAuth({
    logger: { disabled: options.optionsOnly },
    baseURL: process.env.SITE_URL!,
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false, // Enable in production
    },
    plugins: [convex()],
  });
};

// Helper to get current user in queries/mutations
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return authComponent.getAuthUser(ctx);
  },
});

// Helper function for use in other queries/mutations
export async function getAuthUser(ctx: any) {
  const authUser = await authComponent.getAuthUser(ctx);
  if (!authUser) return null;

  // Get full user profile
  const user = await ctx.db
    .query("users")
    .withIndex("by_auth_user", (q: any) => q.eq("authUserId", authUser.id))
    .first();

  return user;
}
```

**4. HTTP Routes**
```typescript
// convex/http.ts
import { httpRouter } from "convex/server";
import { authComponent, createAuth } from "./auth";

const http = httpRouter();

// Register better-auth routes
authComponent.registerRoutes(http, createAuth);

// Add CORS for mobile app if needed
http.route({
  path: "/.well-known/openid-configuration",
  method: "GET",
  handler: async () => {
    return new Response(JSON.stringify({
      issuer: process.env.CONVEX_SITE_URL,
    }), {
      headers: { "Content-Type": "application/json" },
    });
  },
});

export default http;
```

**5. Client-Side Auth (Expo)**

> **Important**: Use the official `@better-auth/expo` plugin for React Native. This provides secure storage via expo-secure-store and proper deep linking support.

```bash
# Install dependencies
npx expo install expo-secure-store expo-linking expo-web-browser expo-constants
npm install @better-auth/expo
```

```typescript
// lib/auth-client.ts
import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";

export const authClient = createAuthClient({
  baseURL: process.env.EXPO_PUBLIC_CONVEX_SITE_URL,
  plugins: [
    expoClient({
      scheme: "flowday",           // Must match app.json scheme
      storagePrefix: "flowday",    // Prefix for stored keys
      storage: SecureStore,        // Secure storage for tokens
      // disableCache: false,      // Session caching enabled by default
    }),
  ],
});

// Export hooks and methods
export const { useSession, signIn, signUp, signOut } = authClient;
```

**6. App Scheme Configuration**

Add scheme to `app.json` for deep linking:
```json
{
  "expo": {
    "scheme": "flowday",
    "ios": {
      "bundleIdentifier": "com.flowday.app"
    },
    "android": {
      "package": "com.flowday.app"
    }
  }
}
```

**7. Server-Side: Add Expo Plugin & Trusted Origins**
```typescript
// convex/auth.ts - Update createAuth function
import { expo } from "@better-auth/expo";

export const createAuth = (ctx: any, options = { optionsOnly: false }) => {
  return betterAuth({
    logger: { disabled: options.optionsOnly },
    baseURL: process.env.SITE_URL!,
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false, // Enable in production
    },
    plugins: [
      convex(),
      expo(),  // Add Expo plugin for mobile support
    ],
    trustedOrigins: [
      "flowday://",                    // Production deep link
      "exp://192.168.*.*:*",           // Expo Go development (local network)
      "exp://localhost:*",             // Expo Go localhost
    ],
  });
};
```

**8. Provider Setup (React Native)**
```typescript
// app/_layout.tsx
import { ConvexReactClient } from "convex/react";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { authClient } from "@/lib/auth-client";

const convex = new ConvexReactClient(
  process.env.EXPO_PUBLIC_CONVEX_URL!,
  { expectAuth: true }
);

export default function RootLayout() {
  return (
    <ConvexBetterAuthProvider client={convex} authClient={authClient}>
      <Stack />
    </ConvexBetterAuthProvider>
  );
}
```

### Sign In/Sign Up Flow

```typescript
// app/(auth)/sign-in.tsx
import { useState } from "react";
import { View, TextInput, Pressable, Text } from "react-native";
import { authClient } from "@/lib/auth-client";
import { router } from "expo-router";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);
    setError("");

    try {
      await authClient.signIn.email({
        email,
        password,
      });
      router.replace("/(tabs)");
    } catch (err: any) {
      setError(err.message || "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      {error && <Text style={{ color: "red" }}>{error}</Text>}
      <Pressable onPress={handleSignIn} disabled={loading}>
        <Text>{loading ? "Signing in..." : "Sign In"}</Text>
      </Pressable>
    </View>
  );
}
```

---

## 6. ElevenLabs Voice Integration

> **Important**: Due to a compatibility issue between `@livekit/react-native-webrtc` and React Native 0.81 / Expo SDK 54 (see [Challenge 7](#challenge-7-livekit-webrtc--react-native-081-compatibility)), we use two different approaches:
> - **Phase 1 (Text Mode)**: Direct WebSocket API - no native dependencies
> - **Phase 2 (Voice Mode)**: Full SDK with LiveKit - requires build fixes

---

### Phase 1: Direct WebSocket API (Text-Only Mode)

This approach bypasses LiveKit/WebRTC entirely by connecting directly to ElevenLabs' WebSocket API. It requires **zero native modules** and works in Expo Go during development.

**Benefits:**
- No native dependencies or build issues
- Works in Expo Go for rapid development
- Text conversations use a separate concurrency pool (better quota)
- Same agent, same tools, same conversation quality

**1. Backend: Signed URL Generation**

```typescript
// convex/agent.ts
import { action } from "./_generated/server";
import { v } from "convex/values";

// Generate signed URL for WebSocket connection
export const getSignedUrl = action({
  args: { agentId: v.string() },
  handler: async (ctx, { agentId }) => {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) throw new Error("ELEVENLABS_API_KEY not configured");

    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agentId}`,
      { headers: { "xi-api-key": apiKey } }
    );

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const { signed_url } = await response.json();
    return signed_url; // Valid for 15 minutes
  },
});
```

**2. WebSocket Service**

```typescript
// lib/elevenlabs-websocket.ts
type MessageHandler = (message: AgentMessage) => void;
type StatusHandler = (status: ConnectionStatus) => void;

interface AgentMessage {
  type: "agent_response" | "user_transcript" | "error";
  text?: string;
  error?: string;
}

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

export class ElevenLabsWebSocket {
  private ws: WebSocket | null = null;
  private messageHandlers: MessageHandler[] = [];
  private statusHandlers: StatusHandler[] = [];
  private status: ConnectionStatus = "disconnected";

  async connect(signedUrl: string, options?: {
    textOnly?: boolean;
    overrides?: Record<string, any>;
  }): Promise<void> {
    this.setStatus("connecting");

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(signedUrl);

      this.ws.onopen = () => {
        // Send initialization message
        this.ws?.send(JSON.stringify({
          type: "conversation_initiation_client_data",
          conversation_config_override: {
            conversation: { textOnly: options?.textOnly ?? true },
            agent: options?.overrides?.agent,
          },
        }));
        this.setStatus("connected");
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (err) {
          console.error("Failed to parse WebSocket message:", err);
        }
      };

      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        this.setStatus("error");
        reject(new Error("WebSocket connection failed"));
      };

      this.ws.onclose = () => {
        this.setStatus("disconnected");
      };
    });
  }

  private handleMessage(data: any) {
    switch (data.type) {
      case "agent_response":
        this.notifyHandlers({
          type: "agent_response",
          text: data.agent_response_event?.agent_response,
        });
        break;
      case "user_transcript":
        this.notifyHandlers({
          type: "user_transcript",
          text: data.user_transcription_event?.user_transcript,
        });
        break;
      case "error":
        this.notifyHandlers({
          type: "error",
          error: data.error?.message || "Unknown error",
        });
        break;
      // Handle tool calls from agent
      case "client_tool_call":
        // Tool calls are handled separately - see useTextAgent hook
        break;
    }
  }

  sendMessage(text: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: "user_message",
        user_message: { text },
      }));
    }
  }

  // Send tool result back to agent
  sendToolResult(toolCallId: string, result: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: "client_tool_result",
        tool_call_id: toolCallId,
        result,
      }));
    }
  }

  disconnect() {
    this.ws?.close();
    this.ws = null;
    this.setStatus("disconnected");
  }

  onMessage(handler: MessageHandler) {
    this.messageHandlers.push(handler);
    return () => {
      this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
    };
  }

  onStatusChange(handler: StatusHandler) {
    this.statusHandlers.push(handler);
    return () => {
      this.statusHandlers = this.statusHandlers.filter(h => h !== handler);
    };
  }

  private setStatus(status: ConnectionStatus) {
    this.status = status;
    this.statusHandlers.forEach(h => h(status));
  }

  private notifyHandlers(message: AgentMessage) {
    this.messageHandlers.forEach(h => h(message));
  }

  getStatus() {
    return this.status;
  }
}
```

**3. Text Agent Hook (Phase 1)**

```typescript
// hooks/useTextAgent.ts
import { useState, useCallback, useRef, useEffect } from "react";
import { useAction, useMutation } from "convex/react";
import { useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ElevenLabsWebSocket } from "@/lib/elevenlabs-websocket";

const AGENT_ID = process.env.EXPO_PUBLIC_ELEVENLABS_AGENT_ID!;

interface Message {
  id: string;
  text: string;
  source: "user" | "assistant";
  timestamp: number;
}

export function useTextAgent() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<"disconnected" | "connecting" | "connected" | "error">("disconnected");
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<ElevenLabsWebSocket | null>(null);
  const messageIdRef = useRef(0);

  const convex = useConvex();
  const getSignedUrl = useAction(api.agent.getSignedUrl);
  const createBlock = useMutation(api.blocks.create);

  // Client tools - same as voice mode
  const clientTools = useRef({
    getScheduleForDate: async (params: { date: string }) => {
      const blocks = await convex.query(api.blocks.getByDate, { date: params.date });
      return JSON.stringify({ date: params.date, blocks: blocks || [], count: blocks?.length || 0 });
    },
    addTaskToSchedule: async (params: any) => {
      try {
        const blockId = await createBlock({
          date: params.date,
          startTime: params.startTime,
          endTime: params.endTime,
          title: params.title,
          source: "ai_suggestion",
          requiresTravel: params.requiresTravel || false,
        });
        return JSON.stringify({ success: true, blockId });
      } catch (err: any) {
        return JSON.stringify({ success: false, error: err.message });
      }
    },
    // Add more tools as needed...
  });

  const connect = useCallback(async () => {
    try {
      setStatus("connecting");
      setError(null);

      const signedUrl = await getSignedUrl({ agentId: AGENT_ID });

      const ws = new ElevenLabsWebSocket();
      wsRef.current = ws;

      ws.onStatusChange(setStatus);

      ws.onMessage((msg) => {
        if (msg.type === "agent_response" && msg.text) {
          setMessages(prev => [...prev, {
            id: `msg_${++messageIdRef.current}`,
            text: msg.text!,
            source: "assistant",
            timestamp: Date.now(),
          }]);
        }
      });

      await ws.connect(signedUrl, { textOnly: true });
    } catch (err: any) {
      setError(err.message);
      setStatus("error");
    }
  }, [getSignedUrl]);

  const disconnect = useCallback(() => {
    wsRef.current?.disconnect();
    wsRef.current = null;
  }, []);

  const sendMessage = useCallback((text: string) => {
    if (wsRef.current?.getStatus() === "connected") {
      // Add user message to UI immediately
      setMessages(prev => [...prev, {
        id: `msg_${++messageIdRef.current}`,
        text,
        source: "user",
        timestamp: Date.now(),
      }]);
      wsRef.current.sendMessage(text);
    }
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    connect();
    return () => disconnect();
  }, []);

  return {
    messages,
    status,
    error,
    isConnected: status === "connected",
    connect,
    disconnect,
    sendMessage,
    clearMessages: () => setMessages([]),
  };
}
```

---

### Phase 2: Full SDK Setup (Voice Mode)

> **Note**: This section requires resolving the LiveKit/WebRTC compatibility issue first.
> See [Challenge 7](#challenge-7-livekit-webrtc--react-native-081-compatibility) for solutions.

**1. Installation (After Resolving Build Issues)**
```bash
bunx expo install @elevenlabs/react-native @livekit/react-native @livekit/react-native-webrtc livekit-client
```

**2. Expo Config (app.json)**
```json
{
  "expo": {
    "plugins": [
      [
        "expo-build-properties",
        {
          "ios": {
            "useFrameworks": "static"
          }
        }
      ]
    ],
    "ios": {
      "infoPlist": {
        "NSMicrophoneUsageDescription": "FlowDay uses the microphone for voice conversations with your AI assistant.",
        "UIBackgroundModes": ["audio"]
      }
    },
    "android": {
      "permissions": [
        "android.permission.RECORD_AUDIO",
        "android.permission.MODIFY_AUDIO_SETTINGS"
      ]
    }
  }
}
```

### Voice Agent Hook (Phase 2)

```typescript
// hooks/useVoiceAgent.ts
import { useConversation } from "@elevenlabs/react-native";
import { useConvex } from "convex/react";
import { useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useCallback, useRef, useEffect } from "react";
import * as ExpoAV from "expo-av";
import { Id } from "@/convex/_generated/dataModel";

interface Message {
  id: string;
  text: string;
  source: "user" | "assistant";
  timestamp: number;
}

interface ProposedBlock {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  requiresTravel: boolean;
  locationId?: string;
}

// Preview timeout duration (60 seconds)
const PREVIEW_TIMEOUT_MS = 60000;

export function useVoiceAgent() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [previewBlocks, setPreviewBlocks] = useState<ProposedBlock[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const messageIdRef = useRef(0);
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const conversationRef = useRef<any>(null);

  // Get Convex client for direct queries in tools
  const convex = useConvex();

  // Convex hooks for mutations and actions
  const getToken = useAction(api.agent.getConversationToken);
  const getContext = useAction(api.agent.getAgentContext);
  const createBlock = useMutation(api.blocks.create);
  const calculateTravel = useAction(api.maps.calculateTravelTime);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }
      // End session if still connected
      if (conversationRef.current?.status === "connected") {
        conversationRef.current.endSession();
      }
    };
  }, []);

  // Clear preview timeout helper
  const clearPreviewTimeout = useCallback(() => {
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
      previewTimeoutRef.current = null;
    }
  }, []);

  const conversation = useConversation({
    onConnect: ({ conversationId }) => {
      console.log("Connected:", conversationId);
      setError(null);
    },
    onDisconnect: (details) => {
      console.log("Disconnected:", details?.reason);
      // Show reconnect prompt if disconnected unexpectedly
      if (details?.reason === "error") {
        setError("Connection lost. Tap the mic to reconnect.");
      }
    },
    onMessage: ({ message, source }) => {
      const newMessage: Message = {
        id: `msg_${++messageIdRef.current}`,
        text: message,
        source: source as "user" | "assistant",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, newMessage]);
    },
    onError: (message, context) => {
      console.error("ElevenLabs error:", message, context);
      setError(message || "Voice connection error");
    },
    onStatusChange: ({ status }) => {
      console.log("Status:", status);
    },

    // Client-side tools the agent can call
    clientTools: {
      // Get schedule for a specific date
      // IMPORTANT: Use convex.query() for fresh data, not hook results
      getScheduleForDate: async (params: { date: string }) => {
        try {
          const blocks = await convex.query(api.blocks.getByDate, {
            date: params.date
          });

          if (!blocks || blocks.length === 0) {
            return JSON.stringify({
              date: params.date,
              blocks: [],
              message: "No blocks scheduled"
            });
          }

          // Return summarized data to avoid size limits
          const summary = blocks.map(b => ({
            id: b._id,
            title: b.title,
            startTime: b.startTime,
            endTime: b.endTime,
            status: b.status,
            locationId: b.locationId,
          }));

          return JSON.stringify({
            date: params.date,
            blocks: summary,
            count: blocks.length
          });
        } catch (err: any) {
          return JSON.stringify({
            success: false,
            error: err.message
          });
        }
      },

      // Show schedule preview to user (blocking tool)
      showSchedulePreview: (params: { blocks: ProposedBlock[] }) => {
        setPreviewBlocks(params.blocks);
        setShowPreview(true);

        // Set timeout to auto-cancel preview
        clearPreviewTimeout();
        previewTimeoutRef.current = setTimeout(() => {
          setShowPreview(false);
          setPreviewBlocks([]);
          // Notify agent that preview timed out
          conversationRef.current?.sendContextualUpdate(
            "Preview timed out. User did not respond. Ask if they want to try again."
          );
        }, PREVIEW_TIMEOUT_MS);

        return "Showing preview to user. Waiting for confirmation.";
      },

      // Add a single task with structured response
      addTaskToSchedule: async (params: {
        title: string;
        date: string;
        startTime: string;
        endTime: string;
        requiresTravel: boolean;
        locationId?: string;
        goalId?: string;
      }) => {
        try {
          const blockId = await createBlock({
            date: params.date,
            startTime: params.startTime,
            endTime: params.endTime,
            title: params.title,
            source: "ai_suggestion",
            requiresTravel: params.requiresTravel,
            locationId: params.locationId as Id<"locations"> | undefined,
            goalId: params.goalId as Id<"goals"> | undefined,
          });

          return JSON.stringify({
            success: true,
            message: `Added "${params.title}" from ${params.startTime} to ${params.endTime}`,
            blockId
          });
        } catch (err: any) {
          // Provide actionable error to agent
          const isConflict = err.message?.includes("Conflict");
          return JSON.stringify({
            success: false,
            error: err.message,
            suggestion: isConflict
              ? "Try a different time slot"
              : "Please try again"
          });
        }
      },

      // Get goals and progress using direct query
      getGoalsProgress: async () => {
        try {
          const goals = await convex.query(api.goals.getWithProgress);

          if (!goals || goals.length === 0) {
            return JSON.stringify({
              goals: [],
              message: "No active goals"
            });
          }

          // Summarize for agent
          const summary = goals.map(g => ({
            id: g._id,
            title: g.title,
            weeklyTargetMinutes: g.weeklyTargetMinutes,
            completedMinutes: g.weeklyProgress?.completedMinutes || 0,
            remainingMinutes: g.remainingMinutes,
            preferredTime: g.preferredTime,
          }));

          return JSON.stringify({ goals: summary });
        } catch (err: any) {
          return JSON.stringify({
            success: false,
            error: err.message
          });
        }
      },

      // Calculate travel time with proper typing
      calculateTravelTime: async (params: {
        fromLocationId: string;
        toLocationId: string;
      }) => {
        try {
          const minutes = await calculateTravel({
            fromLocationId: params.fromLocationId as Id<"locations">,
            toLocationId: params.toLocationId as Id<"locations">,
          });
          return JSON.stringify({
            success: true,
            travelTimeMinutes: minutes,
            message: `Travel time: ${minutes} minutes`
          });
        } catch (err: any) {
          // Provide fallback estimate instead of failing
          return JSON.stringify({
            success: false,
            error: err.message,
            fallbackMinutes: 20,
            message: "Could not calculate exact travel time. Estimating 20 minutes."
          });
        }
      },
    },
  });

  // Store conversation ref for use in timeouts
  useEffect(() => {
    conversationRef.current = conversation;
  }, [conversation]);

  // Request microphone permission with denied state tracking
  const requestMicPermission = useCallback(async () => {
    const { status } = await ExpoAV.Audio.requestPermissionsAsync();

    if (status === "denied") {
      setPermissionDenied(true);
      setError("Microphone permission denied. Please enable in Settings.");
      return false;
    }

    if (status !== "granted") {
      setError("Microphone permission is required for voice conversations");
      return false;
    }

    setPermissionDenied(false);

    // Configure audio session for recording
    await ExpoAV.Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
    });

    return true;
  }, []);

  // Start voice conversation
  const startVoice = useCallback(async () => {
    const hasPermission = await requestMicPermission();
    if (!hasPermission) return;

    try {
      // Get conversation token from backend
      const token = await getToken();

      // Get user context for dynamic variables
      const context = await getContext();

      await conversation.startSession({
        conversationToken: token,
        // Note: dynamicVariables should contain strings, numbers, booleans only
        dynamicVariables: context,
      });
    } catch (err: any) {
      setError(err.message || "Failed to start conversation");
    }
  }, [getToken, getContext, conversation, requestMicPermission]);

  // End voice conversation
  const stopVoice = useCallback(async () => {
    clearPreviewTimeout();
    await conversation.endSession();
  }, [conversation, clearPreviewTimeout]);

  // Send text message (text-only mode or during voice)
  const sendText = useCallback((text: string) => {
    if (conversation.status === "connected") {
      conversation.sendUserMessage(text);
    }
  }, [conversation]);

  // Confirm schedule preview
  const confirmPreview = useCallback(async () => {
    clearPreviewTimeout();

    const results: { title: string; success: boolean; error?: string }[] = [];

    for (const block of previewBlocks) {
      try {
        await createBlock({
          date: block.date,
          startTime: block.startTime,
          endTime: block.endTime,
          title: block.title,
          source: "ai_suggestion",
          requiresTravel: block.requiresTravel,
          locationId: block.locationId as Id<"locations"> | undefined,
        });
        results.push({ title: block.title, success: true });
      } catch (err: any) {
        results.push({ title: block.title, success: false, error: err.message });
      }
    }

    setPreviewBlocks([]);
    setShowPreview(false);

    // Notify agent with detailed results
    const successCount = results.filter(r => r.success).length;
    const failures = results.filter(r => !r.success);

    let message = `User confirmed. ${successCount}/${results.length} blocks added successfully.`;
    if (failures.length > 0) {
      message += ` Failed: ${failures.map(f => `${f.title} (${f.error})`).join(", ")}`;
    }

    conversation.sendContextualUpdate(message);
  }, [previewBlocks, createBlock, conversation, clearPreviewTimeout]);

  // Cancel schedule preview
  const cancelPreview = useCallback(() => {
    clearPreviewTimeout();
    setPreviewBlocks([]);
    setShowPreview(false);
    conversation.sendContextualUpdate("User cancelled the schedule preview. Ask if they want different times.");
  }, [conversation, clearPreviewTimeout]);

  // Memoized clear functions
  const clearMessages = useCallback(() => setMessages([]), []);
  const clearError = useCallback(() => setError(null), []);

  return {
    // State
    messages,
    previewBlocks,
    showPreview,
    error,
    permissionDenied,
    status: conversation.status,
    isSpeaking: conversation.isSpeaking,

    // Actions
    startVoice,
    stopVoice,
    sendText,
    confirmPreview,
    cancelPreview,
    clearMessages,
    clearError,

    // Audio controls
    setVolume: conversation.setVolume,
    setMicMuted: conversation.setMicMuted,
  };
}
```

### Agent Chat Screen

```typescript
// app/(tabs)/agent.tsx
import { View, FlatList, TextInput, Pressable, Modal, Text } from "react-native";
import { useVoiceAgent } from "@/hooks/useVoiceAgent";
import { StyleSheet } from "react-native-unistyles";
import { useState } from "react";

export default function AgentScreen() {
  const {
    messages,
    previewBlocks,
    showPreview,
    error,
    status,
    isSpeaking,
    startVoice,
    stopVoice,
    sendText,
    confirmPreview,
    cancelPreview,
  } = useVoiceAgent();

  const [textInput, setTextInput] = useState("");

  const handleSendText = () => {
    if (textInput.trim()) {
      sendText(textInput.trim());
      setTextInput("");
    }
  };

  const isConnected = status === "connected";

  return (
    <View style={styles.container}>
      {/* Error banner */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Messages */}
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[
            styles.messageBubble,
            item.source === "user" ? styles.userBubble : styles.assistantBubble
          ]}>
            <Text style={styles.messageText}>{item.text}</Text>
          </View>
        )}
        contentContainerStyle={styles.messagesList}
        inverted={false}
      />

      {/* Status indicator */}
      {isConnected && (
        <View style={styles.statusBar}>
          <View style={[styles.statusDot, isSpeaking && styles.statusDotActive]} />
          <Text style={styles.statusText}>
            {isSpeaking ? "Assistant speaking..." : "Listening..."}
          </Text>
        </View>
      )}

      {/* Input area */}
      <View style={styles.inputArea}>
        {/* Text input */}
        <TextInput
          style={styles.textInput}
          placeholder="Type a message..."
          value={textInput}
          onChangeText={setTextInput}
          onSubmitEditing={handleSendText}
          editable={isConnected}
        />

        {/* Voice button */}
        <Pressable
          style={[
            styles.voiceButton,
            isConnected && styles.voiceButtonActive
          ]}
          onPress={isConnected ? stopVoice : startVoice}
        >
          <MicrophoneIcon active={isConnected} />
        </Pressable>
      </View>

      {/* Schedule preview modal */}
      <Modal visible={showPreview} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Proposed Schedule</Text>
            {previewBlocks.map((block, i) => (
              <View key={i} style={styles.previewBlock}>
                <Text style={styles.previewTitle}>{block.title}</Text>
                <Text style={styles.previewTime}>
                  {block.startTime} - {block.endTime}
                </Text>
              </View>
            ))}
            <View style={styles.modalButtons}>
              <Pressable style={styles.cancelButton} onPress={cancelPreview}>
                <Text>Cancel</Text>
              </Pressable>
              <Pressable style={styles.confirmButton} onPress={confirmPreview}>
                <Text style={styles.confirmText}>Confirm</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  messagesList: {
    padding: theme.spacing.md,
  },
  messageBubble: {
    padding: theme.spacing.sm,
    borderRadius: 12,
    marginBottom: theme.spacing.xs,
    maxWidth: "80%",
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: theme.colors.primary,
  },
  assistantBubble: {
    alignSelf: "flex-start",
    backgroundColor: theme.colors.surface,
  },
  messageText: {
    color: theme.colors.text,
  },
  // ... more styles
}));
```

---

## 7. AI Agent Prompt Engineering

### ElevenLabs Agent System Prompt

Configure this in the ElevenLabs dashboard:

```markdown
# FlowDay AI Assistant

You are FlowDay, a friendly and efficient AI scheduling assistant. Your job is to help users plan their days through natural conversation. You're speaking directly to the user via voice, so keep your responses conversational and concise.

## Your Personality
- Warm but efficient—you respect the user's time
- Proactive—you anticipate needs and suggest optimizations
- Encouraging—you celebrate completions without being over-the-top
- Practical—you focus on actionable outcomes

## User Context
You have access to these dynamic variables:
- User's name: {{user_name}}
- Wake time: {{wake_time}}
- Sleep time: {{sleep_time}}
- Peak energy window: {{peak_energy}}
- Today's date: {{today_date}}
- Tomorrow's date: {{tomorrow_date}}
- Today's schedule: {{today_schedule}}
- Tomorrow's schedule: {{tomorrow_schedule}}
- Goals summary: {{goals_summary}}
- Saved locations: {{locations}}

## Your Capabilities

### Planning
- Add tasks and activities to the user's schedule
- Schedule goal sessions based on targets in {{goals_summary}}
- Respect energy preferences (check {{current_energy}} and {{energy_tips}})

### Information
- Answer questions about the user's schedule using {{today_schedule}} and {{tomorrow_schedule}}
- Report on goal progress using {{goals_summary}} (includes weekly targets and completion)
- Suggest activities for free time slots

### Context Variables Available
You have access to pre-loaded context that is automatically refreshed:
- {{goals_summary}} - Contains goal progress, hours completed, sessions needed
- {{travel_times}} - Pre-calculated travel times between saved locations
- {{current_energy}} and {{energy_tips}} - Current energy level and recommendations
- {{lazy_mode}} - Whether lazy mode is active (suggest lighter tasks if so)

## Current Limitations
- Cannot reschedule existing blocks (user must delete and recreate manually)
- Cannot create or update goals via conversation (use the Goals tab in the app)
- Cannot calculate travel time dynamically (use {{travel_times}} from context)
- Cannot show bulk preview before confirming (add tasks one at a time)
- Cannot query goal progress live (use {{goals_summary}} from context)

## Tools Available

### getScheduleForDate
Use this FIRST before proposing any schedule changes. Parameters: { date: "YYYY-MM-DD" }
Returns the list of scheduled blocks for that date.

### addTaskToSchedule
Use this for adding confirmed tasks. Parameters:
- title: string
- date: "YYYY-MM-DD"
- startTime: "HH:MM"
- endTime: "HH:MM"
- requiresTravel: boolean

**Important**: Always confirm with the user before calling this tool. There is no undo.

## Response Guidelines

1. **Be concise**: This is voice. Keep responses to 1-3 sentences unless detail is needed.

2. **Confirm before committing**: Always confirm time slots before adding tasks.
   - Good: "I can fit gym from 6 to 7. Does that work?"
   - Bad: "I've added gym from 6 to 7." (without confirmation)

3. **Show your reasoning briefly**:
   - "You're free from 6 to 8, and gym takes about an hour with commute..."

4. **Handle conflicts gracefully**:
   - "That slot has your React study session. Want me to move it, or schedule gym at 7 instead?"

5. **Connect tasks to goals when relevant**:
   - "Adding 45 minutes of React—you'll be at 3 hours this week, just 2 more to hit your target."

## Example Conversations

**User**: "Plan my tomorrow"
**You**: [Call getScheduleForDate] "Tomorrow you've got work from 8 to 5. Looking at your goals, you're 2 hours behind on React this week. Want me to add a 45-minute study session before work, around 6:30?"

**User**: "I want to go to the gym and do laundry tomorrow"
**You**: [Call getScheduleForDate, check {{travel_times}}] "I can fit gym from 6 to 7pm—based on your saved travel times, that gives you about 20 minutes to get there. Laundry at 8 when you're back home. Sound good?"

**User**: "I have 30 minutes free right now"
**You**: [Check {{goals_summary}}] "Looking at your goals, you're behind on reading this week. Want to use these 30 minutes for that? It's a low-energy task, perfect if you're winding down."

**User**: "Add gym at 6pm tomorrow"
**You**: [Call addTaskToSchedule after confirmation] "I'll add gym from 6 to 7pm tomorrow. Does that work for you?"
**User**: "Yes"
**You**: [Call addTaskToSchedule] "Done! Gym is on your schedule for tomorrow at 6pm."

# Guardrails

- NEVER schedule anything during sleep hours ({{sleep_time}} to {{wake_time}})
- NEVER double-book—always check schedule first using getScheduleForDate
- NEVER add tasks without user confirmation
- ALWAYS use 24-hour time format internally (convert for display if needed)
- ALWAYS check {{travel_times}} when scheduling activities at different locations
- If a request is unclear, ask a clarifying question rather than guessing
- If the user asks to reschedule or move a block, explain they need to delete it first and you can add a new one
```

### Tool Definitions for ElevenLabs

Configure these as **Client Tools** in the ElevenLabs agent dashboard. Use JSON Mode and paste each tool definition individually.

> **Note:** ElevenLabs uses its own tool schema format, not OpenAI function calling format. The `type: "client"` indicates these tools are executed client-side (in the React Native app), not server-side.

#### Phase 1 Tools

**Tool 1: getScheduleForDate**
```json
{
  "type": "client",
  "name": "getScheduleForDate",
  "description": "Get the user's schedule for a specific date. Always call this before proposing schedule changes.",
  "disable_interruptions": false,
  "force_pre_tool_speech": "auto",
  "assignments": [],
  "tool_call_sound": null,
  "tool_call_sound_behavior": "auto",
  "execution_mode": "immediate",
  "expects_response": true,
  "response_timeout_secs": 10,
  "parameters": [
    {
      "id": "date",
      "type": "string",
      "value_type": "llm_prompt",
      "description": "The date in YYYY-MM-DD format",
      "dynamic_variable": "",
      "constant_value": "",
      "enum": null,
      "is_system_provided": false,
      "required": true
    }
  ],
  "dynamic_variables": {
    "dynamic_variable_placeholders": {}
  }
}
```

**Tool 2: addTaskToSchedule**
```json
{
  "type": "client",
  "name": "addTaskToSchedule",
  "description": "Add a single task to the user's schedule. Use only after user confirms the time slot.",
  "disable_interruptions": false,
  "force_pre_tool_speech": "auto",
  "assignments": [],
  "tool_call_sound": null,
  "tool_call_sound_behavior": "auto",
  "execution_mode": "immediate",
  "expects_response": true,
  "response_timeout_secs": 10,
  "parameters": [
    {
      "id": "title",
      "type": "string",
      "value_type": "llm_prompt",
      "description": "Name of the task",
      "dynamic_variable": "",
      "constant_value": "",
      "enum": null,
      "is_system_provided": false,
      "required": true
    },
    {
      "id": "date",
      "type": "string",
      "value_type": "llm_prompt",
      "description": "Date in YYYY-MM-DD format",
      "dynamic_variable": "",
      "constant_value": "",
      "enum": null,
      "is_system_provided": false,
      "required": true
    },
    {
      "id": "startTime",
      "type": "string",
      "value_type": "llm_prompt",
      "description": "Start time in HH:MM format (24-hour)",
      "dynamic_variable": "",
      "constant_value": "",
      "enum": null,
      "is_system_provided": false,
      "required": true
    },
    {
      "id": "endTime",
      "type": "string",
      "value_type": "llm_prompt",
      "description": "End time in HH:MM format (24-hour)",
      "dynamic_variable": "",
      "constant_value": "",
      "enum": null,
      "is_system_provided": false,
      "required": true
    },
    {
      "id": "requiresTravel",
      "type": "boolean",
      "value_type": "llm_prompt",
      "description": "Whether this activity requires traveling to a location",
      "dynamic_variable": "",
      "constant_value": "",
      "enum": null,
      "is_system_provided": false,
      "required": true
    }
  ],
  "dynamic_variables": {
    "dynamic_variable_placeholders": {}
  }
}
```

#### Future Phase Tools (Deferred)

These tools were originally planned but have been deferred. The agent now uses context variables as an alternative approach:

- **showSchedulePreview** - Originally planned for bulk block preview. Deferred; agent adds tasks one at a time with confirmation.
- **getGoalsProgress** - Originally planned for live goal progress queries. Deferred; agent uses {{goals_summary}} context variable instead.
- **calculateTravelTime** - Originally planned for on-demand travel calculation. Deferred; agent uses {{travel_times}} context variable with pre-cached values.

> **Note**: If these tools are still configured in the ElevenLabs dashboard, they should be **removed** to prevent the agent from trying to call them. The system prompt's "Current Limitations" section documents what the agent cannot do.

---

## 8. Scheduling Algorithm

### Slot-Finding Algorithm

```typescript
// lib/scheduling.ts
import { addMinutes, parse, format, isWithinInterval } from "date-fns";

interface TimeSlot {
  startTime: string;  // "HH:MM"
  endTime: string;
  available: boolean;
}

interface Block {
  startTime: string;
  endTime: string;
  title: string;
  flexibility: "fixed" | "semi-flexible" | "free";
}

interface SchedulePreferences {
  wakeTime: string;
  sleepTime: string;
  peakEnergyWindow: "morning" | "afternoon" | "evening";
}

// Convert "HH:MM" to minutes since midnight
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

// Convert minutes since midnight to "HH:MM"
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

// Find available time slots for a given date
export function findAvailableSlots(
  existingBlocks: Block[],
  preferences: SchedulePreferences,
  minDuration: number = 30 // minimum slot duration in minutes
): TimeSlot[] {
  const wakeMinutes = timeToMinutes(preferences.wakeTime);
  const sleepMinutes = timeToMinutes(preferences.sleepTime);

  // Sort blocks by start time
  const sortedBlocks = [...existingBlocks].sort(
    (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
  );

  const slots: TimeSlot[] = [];
  let currentTime = wakeMinutes;

  for (const block of sortedBlocks) {
    const blockStart = timeToMinutes(block.startTime);
    const blockEnd = timeToMinutes(block.endTime);

    // If there's a gap before this block
    if (blockStart - currentTime >= minDuration) {
      slots.push({
        startTime: minutesToTime(currentTime),
        endTime: minutesToTime(blockStart),
        available: true,
      });
    }

    // Move current time past this block
    currentTime = Math.max(currentTime, blockEnd);
  }

  // Check for slot after last block until sleep time
  if (sleepMinutes - currentTime >= minDuration) {
    slots.push({
      startTime: minutesToTime(currentTime),
      endTime: minutesToTime(sleepMinutes),
      available: true,
    });
  }

  return slots;
}

// Find the best slot for a task based on preferences
export function findBestSlot(
  availableSlots: TimeSlot[],
  taskDuration: number,
  preferences: {
    preferredTime: "morning" | "afternoon" | "evening" | "any";
    energyLevel: "high" | "medium" | "low";
    peakEnergyWindow: "morning" | "afternoon" | "evening";
  }
): TimeSlot | null {
  // Filter slots that can fit the task
  const viableSlots = availableSlots.filter((slot) => {
    const duration = timeToMinutes(slot.endTime) - timeToMinutes(slot.startTime);
    return duration >= taskDuration;
  });

  if (viableSlots.length === 0) return null;

  // Score each slot based on preferences
  const scoredSlots = viableSlots.map((slot) => {
    let score = 0;
    const slotMidpoint = (timeToMinutes(slot.startTime) + timeToMinutes(slot.endTime)) / 2;

    // Time of day matching
    const timeOfDay = getTimeOfDay(slotMidpoint);
    if (preferences.preferredTime === timeOfDay || preferences.preferredTime === "any") {
      score += 10;
    }

    // Energy matching
    if (preferences.energyLevel === "high" && timeOfDay === preferences.peakEnergyWindow) {
      score += 15; // High-energy tasks in peak window
    } else if (preferences.energyLevel === "low" && timeOfDay !== preferences.peakEnergyWindow) {
      score += 10; // Low-energy tasks outside peak window
    }

    // Prefer earlier slots (avoid procrastination)
    score -= slotMidpoint / 100;

    return { slot, score };
  });

  // Sort by score and return best
  scoredSlots.sort((a, b) => b.score - a.score);
  return scoredSlots[0]?.slot || null;
}

function getTimeOfDay(minutes: number): "morning" | "afternoon" | "evening" {
  if (minutes < 720) return "morning";      // before 12:00
  if (minutes < 1020) return "afternoon";   // before 17:00
  return "evening";
}

// Schedule goal sessions for the week
export function scheduleGoalSessions(
  goal: {
    weeklyTargetMinutes: number;
    preferredSessionLength: { min: number; max: number };
    preferredTime: "morning" | "afternoon" | "evening" | "any";
    energyLevel: "high" | "medium" | "low";
    completedMinutes: number;
  },
  weekSlots: Map<string, TimeSlot[]>, // date -> available slots
  preferences: SchedulePreferences
): Array<{ date: string; startTime: string; endTime: string }> {
  const remainingMinutes = goal.weeklyTargetMinutes - goal.completedMinutes;
  if (remainingMinutes <= 0) return [];

  const sessions: Array<{ date: string; startTime: string; endTime: string }> = [];
  let scheduledMinutes = 0;

  // Iterate through days, trying to schedule sessions
  for (const [date, slots] of weekSlots) {
    if (scheduledMinutes >= remainingMinutes) break;

    const bestSlot = findBestSlot(slots, goal.preferredSessionLength.min, {
      preferredTime: goal.preferredTime,
      energyLevel: goal.energyLevel,
      peakEnergyWindow: preferences.peakEnergyWindow,
    });

    if (bestSlot) {
      // Calculate session duration (prefer max, but respect slot size)
      const slotDuration = timeToMinutes(bestSlot.endTime) - timeToMinutes(bestSlot.startTime);
      const sessionDuration = Math.min(
        goal.preferredSessionLength.max,
        slotDuration,
        remainingMinutes - scheduledMinutes
      );

      sessions.push({
        date,
        startTime: bestSlot.startTime,
        endTime: minutesToTime(timeToMinutes(bestSlot.startTime) + sessionDuration),
      });

      scheduledMinutes += sessionDuration;
    }
  }

  return sessions;
}
```

---

## 9. Notifications System

### Expo Notifications Setup

```typescript
// lib/notifications.ts
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";

// Configure notification handling
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Request permissions
export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Device.isDevice) {
    console.log("Notifications require a physical device");
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Failed to get notification permission");
    return false;
  }

  // Android requires a notification channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "FlowDay",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  return true;
}

// Define notification categories with actions
export async function setupNotificationCategories(): Promise<void> {
  await Notifications.setNotificationCategoryAsync("TASK_REMINDER", [
    {
      identifier: "START",
      buttonTitle: "Start",
      options: { opensAppToForeground: true },
    },
    {
      identifier: "SNOOZE",
      buttonTitle: "Snooze 10m",
      options: { opensAppToForeground: false },
    },
    {
      identifier: "SKIP",
      buttonTitle: "Skip",
      options: { opensAppToForeground: false, isDestructive: true },
    },
  ]);

  await Notifications.setNotificationCategoryAsync("TASK_OVERDUE", [
    {
      identifier: "START_NOW",
      buttonTitle: "Start Now",
      options: { opensAppToForeground: true },
    },
    {
      identifier: "MOVE_LATER",
      buttonTitle: "Move to Later",
      options: { opensAppToForeground: false },
    },
    {
      identifier: "SKIP",
      buttonTitle: "Skip",
      options: { opensAppToForeground: false, isDestructive: true },
    },
  ]);
}

// Schedule a task notification
// IMPORTANT: Expo SDK 54+ requires explicit trigger type
export async function scheduleTaskNotification(params: {
  blockId: string;
  title: string;
  body: string;
  triggerAt: Date;
  categoryId: string;
  data?: Record<string, any>;
}): Promise<string | null> {
  // Don't schedule if trigger time has already passed
  if (params.triggerAt.getTime() <= Date.now()) {
    console.log("Skipping notification - time already passed");
    return null;
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: params.title,
      body: params.body,
      // Only include blockId to avoid exposing sensitive data
      data: { blockId: params.blockId },
      categoryIdentifier: params.categoryId,
      sound: true,
    },
    trigger: {
      // Expo SDK 54+ requires explicit type field
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: params.triggerAt,
    },
  });

  return id;
}

// Schedule a recurring daily notification
export async function scheduleDailyNotification(params: {
  title: string;
  body: string;
  hour: number;
  minute: number;
  categoryId?: string;
}): Promise<string> {
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: params.title,
      body: params.body,
      categoryIdentifier: params.categoryId,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: params.hour,
      minute: params.minute,
    },
  });

  return id;
}

// Cancel a scheduled notification
export async function cancelNotification(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

// Calculate notification time based on block and travel
export function calculateNotifyTime(params: {
  blockStartTime: Date;
  requiresTravel: boolean;
  travelTimeMinutes?: number;
  prepBufferMinutes: number;
}): Date {
  let notifyTime = new Date(params.blockStartTime);

  if (params.requiresTravel && params.travelTimeMinutes) {
    // Notify: startTime - travelTime - prepBuffer
    notifyTime = new Date(
      notifyTime.getTime() -
      (params.travelTimeMinutes + params.prepBufferMinutes) * 60 * 1000
    );
  }

  return notifyTime;
}
```

### Notification Response Handler

```typescript
// app/_layout.tsx (add to root layout)
import * as Notifications from "expo-notifications";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useRef } from "react";

export default function RootLayout() {
  const updateStatus = useMutation(api.blocks.updateStatus);
  const reschedule = useMutation(api.blocks.reschedule);
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  useEffect(() => {
    // Handle notification responses (user tapped action)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      async (response) => {
        const { blockId } = response.notification.request.content.data;
        const actionId = response.actionIdentifier;

        switch (actionId) {
          case "START":
          case "START_NOW":
            await updateStatus({ blockId, status: "in_progress" });
            // Navigate to timer/focus screen?
            break;

          case "SNOOZE":
            // Reschedule notification for 10 minutes later
            const newTrigger = new Date(Date.now() + 10 * 60 * 1000);
            await scheduleTaskNotification({
              blockId,
              title: response.notification.request.content.title || "Reminder",
              body: "Snoozed reminder",
              triggerAt: newTrigger,
              categoryId: "TASK_REMINDER",
            });
            break;

          case "SKIP":
            await updateStatus({ blockId, status: "skipped" });
            break;

          case "MOVE_LATER":
            // Could open a modal to pick new time
            // For now, move to next available slot
            break;

          default:
            // Default tap - open app to block detail
            break;
        }
      }
    );

    return () => {
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  return (/* ... */);
}
```

---

## 10. Google Routes API Integration

### Convex Action Implementation

```typescript
// convex/maps.ts
import { action, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

interface RouteMatrixResponse {
  originIndex: number;
  destinationIndex: number;
  duration: string;
  distanceMeters: number;
  condition: "ROUTE_EXISTS" | "ROUTE_NOT_FOUND";
  status?: { code: number; message: string };
}

export const calculateTravelTime = action({
  args: {
    fromLocationId: v.id("locations"),
    toLocationId: v.id("locations"),
  },
  handler: async (ctx, { fromLocationId, toLocationId }) => {
    // Check cache first
    const cached = await ctx.runQuery(internal.travelTimeCache.get, {
      fromLocationId,
      toLocationId,
    });

    // Use cache if less than 24 hours old
    if (cached && Date.now() - cached.calculatedAt < 24 * 60 * 60 * 1000) {
      return cached.travelTimeMinutes;
    }

    // Get location details
    const [fromLocation, toLocation] = await Promise.all([
      ctx.runQuery(internal.locations.getById, { id: fromLocationId }),
      ctx.runQuery(internal.locations.getById, { id: toLocationId }),
    ]);

    if (!fromLocation || !toLocation) {
      throw new Error("Location not found");
    }

    const apiKey = process.env.GOOGLE_ROUTES_API_KEY;
    if (!apiKey) {
      throw new Error("Google Routes API key not configured");
    }

    const response = await fetch(
      "https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "originIndex,destinationIndex,duration,distanceMeters,condition,status",
        },
        body: JSON.stringify({
          origins: [{
            waypoint: {
              location: {
                latLng: {
                  latitude: fromLocation.coordinates.lat,
                  longitude: fromLocation.coordinates.lng,
                },
              },
            },
          }],
          destinations: [{
            waypoint: {
              location: {
                latLng: {
                  latitude: toLocation.coordinates.lat,
                  longitude: toLocation.coordinates.lng,
                },
              },
            },
          }],
          travelMode: "DRIVE",
          routingPreference: "TRAFFIC_AWARE",
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Routes API error:", response.status, errorText);
      throw new Error(`Routes API error: ${response.status}`);
    }

    const data: RouteMatrixResponse[] = await response.json();
    const result = data[0];

    if (!result || result.condition !== "ROUTE_EXISTS") {
      throw new Error("Could not calculate route");
    }

    // Parse duration (e.g., "1234s" -> 21 minutes, rounded up)
    const durationSeconds = parseInt(result.duration.replace("s", ""), 10);
    const travelTimeMinutes = Math.ceil(durationSeconds / 60);

    // Cache the result
    await ctx.runMutation(internal.travelTimeCache.upsert, {
      fromLocationId,
      toLocationId,
      travelTimeMinutes,
    });

    return travelTimeMinutes;
  },
});

// Batch calculate travel times for multiple location pairs
export const calculateTravelTimeMatrix = action({
  args: {
    pairs: v.array(v.object({
      fromLocationId: v.id("locations"),
      toLocationId: v.id("locations"),
    })),
  },
  handler: async (ctx, { pairs }) => {
    // Deduplicate and get all unique locations
    const locationIds = new Set<string>();
    pairs.forEach(({ fromLocationId, toLocationId }) => {
      locationIds.add(fromLocationId);
      locationIds.add(toLocationId);
    });

    const locations = await Promise.all(
      Array.from(locationIds).map((id) =>
        ctx.runQuery(internal.locations.getById, { id: id as any })
      )
    );

    const locationMap = new Map(
      locations.filter(Boolean).map((l) => [l!._id, l!])
    );

    // Build origins and destinations arrays
    const uniqueFromIds = [...new Set(pairs.map((p) => p.fromLocationId))];
    const uniqueToIds = [...new Set(pairs.map((p) => p.toLocationId))];

    const origins = uniqueFromIds.map((id) => ({
      waypoint: {
        location: {
          latLng: {
            latitude: locationMap.get(id)!.coordinates.lat,
            longitude: locationMap.get(id)!.coordinates.lng,
          },
        },
      },
    }));

    const destinations = uniqueToIds.map((id) => ({
      waypoint: {
        location: {
          latLng: {
            latitude: locationMap.get(id)!.coordinates.lat,
            longitude: locationMap.get(id)!.coordinates.lng,
          },
        },
      },
    }));

    const response = await fetch(
      "https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": process.env.GOOGLE_ROUTES_API_KEY!,
          "X-Goog-FieldMask": "originIndex,destinationIndex,duration,condition",
        },
        body: JSON.stringify({
          origins,
          destinations,
          travelMode: "DRIVE",
          routingPreference: "TRAFFIC_AWARE",
        }),
      }
    );

    const data: RouteMatrixResponse[] = await response.json();

    // Build result map
    const results = new Map<string, number>();

    for (const result of data) {
      if (result.condition === "ROUTE_EXISTS") {
        const fromId = uniqueFromIds[result.originIndex];
        const toId = uniqueToIds[result.destinationIndex];
        const key = `${fromId}:${toId}`;
        const minutes = Math.ceil(parseInt(result.duration.replace("s", ""), 10) / 60);
        results.set(key, minutes);

        // Cache each result
        await ctx.runMutation(internal.travelTimeCache.upsert, {
          fromLocationId: fromId,
          toLocationId: toId,
          travelTimeMinutes: minutes,
        });
      }
    }

    return Object.fromEntries(results);
  },
});
```

---

## 11. State Management Strategy

### What Goes Where

| Data Type | Location | Why |
|-----------|----------|-----|
| User profile, preferences | Convex | Source of truth, synced across devices |
| Schedule blocks | Convex | Real-time sync, shared state |
| Goals and progress | Convex | Persistence, analytics |
| Locations | Convex | Shared across features |
| Conversation messages | Local state (useState) | Ephemeral, per-session |
| UI state (modals, tabs) | Zustand | Cross-component, no persistence needed |
| Form inputs | Local state | Component-specific |
| Cached travel times | Convex | Persistence, reduce API calls |

### Zustand Store for UI State

```typescript
// stores/ui.ts
import { create } from "zustand";

interface UIState {
  // Tab state
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;

  // Modal state
  isOnboardingVisible: boolean;
  setOnboardingVisible: (visible: boolean) => void;

  // Agent state
  isAgentExpanded: boolean;
  toggleAgentExpanded: () => void;

  // Timeline state
  currentTimeIndicatorVisible: boolean;
  setCurrentTimeIndicatorVisible: (visible: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  selectedDate: new Date(),
  setSelectedDate: (date) => set({ selectedDate: date }),

  isOnboardingVisible: false,
  setOnboardingVisible: (visible) => set({ isOnboardingVisible: visible }),

  isAgentExpanded: false,
  toggleAgentExpanded: () => set((state) => ({ isAgentExpanded: !state.isAgentExpanded })),

  currentTimeIndicatorVisible: true,
  setCurrentTimeIndicatorVisible: (visible) => set({ currentTimeIndicatorVisible: visible }),
}));
```

### Optimistic Updates Pattern

```typescript
// Example: Completing a block with optimistic update
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

function BlockItem({ block }: { block: Block }) {
  const updateStatus = useMutation(api.blocks.updateStatus);
  const [optimisticStatus, setOptimisticStatus] = useState(block.status);

  const handleComplete = async () => {
    // Optimistic update
    setOptimisticStatus("completed");

    try {
      await updateStatus({ blockId: block._id, status: "completed" });
    } catch (error) {
      // Rollback on error
      setOptimisticStatus(block.status);
      console.error("Failed to update:", error);
    }
  };

  // Use optimistic value for immediate feedback
  const displayStatus = optimisticStatus;

  return (
    <Pressable onPress={handleComplete}>
      <Text>{block.title}</Text>
      <StatusBadge status={displayStatus} />
    </Pressable>
  );
}
```

---

## 12. Styling with react-native-unistyles

### Configuration

```typescript
// styles/unistyles.ts
import { StyleSheet } from "react-native-unistyles";

// Define color palette
const palette = {
  // Primary
  blue50: "#EFF6FF",
  blue500: "#3B82F6",
  blue600: "#2563EB",

  // Neutral
  gray50: "#F9FAFB",
  gray100: "#F3F4F6",
  gray200: "#E5E7EB",
  gray500: "#6B7280",
  gray900: "#111827",

  // Status colors
  green500: "#22C55E",
  red500: "#EF4444",
  yellow500: "#EAB308",

  // Background
  white: "#FFFFFF",
  black: "#000000",
};

// Light theme
const lightTheme = {
  colors: {
    // Backgrounds
    background: palette.white,
    surface: palette.gray50,
    surfaceElevated: palette.white,

    // Text
    text: palette.gray900,
    textSecondary: palette.gray500,
    textInverse: palette.white,

    // Primary
    primary: palette.blue600,
    primaryLight: palette.blue50,

    // Block status colors
    blockFixed: palette.gray200,
    blockPlanned: palette.blue500,
    blockCompleted: palette.green500,
    blockSkipped: palette.red500,
    blockInProgress: palette.yellow500,

    // Border
    border: palette.gray200,
    borderFocus: palette.blue500,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
  typography: {
    // Font sizes
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    "2xl": 24,
    "3xl": 30,
  },
};

// Dark theme
const darkTheme = {
  colors: {
    background: palette.gray900,
    surface: "#1F2937",
    surfaceElevated: "#374151",

    text: palette.white,
    textSecondary: palette.gray500,
    textInverse: palette.gray900,

    primary: palette.blue500,
    primaryLight: "#1E3A5F",

    blockFixed: "#374151",
    blockPlanned: palette.blue500,
    blockCompleted: palette.green500,
    blockSkipped: palette.red500,
    blockInProgress: palette.yellow500,

    border: "#374151",
    borderFocus: palette.blue500,
  },
  spacing: lightTheme.spacing,
  borderRadius: lightTheme.borderRadius,
  typography: lightTheme.typography,
};

// Breakpoints
const breakpoints = {
  xs: 0,
  sm: 380,
  md: 768,
  lg: 1024,
};

// Configure Unistyles
StyleSheet.configure({
  themes: {
    light: lightTheme,
    dark: darkTheme,
  },
  breakpoints,
  settings: {
    adaptiveThemes: true, // Auto-switch based on system preference
  },
});

// TypeScript declarations
type AppThemes = {
  light: typeof lightTheme;
  dark: typeof darkTheme;
};

type AppBreakpoints = typeof breakpoints;

declare module "react-native-unistyles" {
  export interface UnistylesThemes extends AppThemes {}
  export interface UnistylesBreakpoints extends AppBreakpoints {}
}

export { lightTheme, darkTheme };
```

### Usage Example

```typescript
// components/timeline/TimeBlock.tsx
import { View, Text, Pressable } from "react-native";
import { StyleSheet } from "react-native-unistyles";

interface TimeBlockProps {
  title: string;
  startTime: string;
  endTime: string;
  status: "planned" | "in_progress" | "completed" | "skipped" | "fixed";
  onPress?: () => void;
}

export function TimeBlock({ title, startTime, endTime, status, onPress }: TimeBlockProps) {
  return (
    <Pressable
      style={[styles.container, styles[`status_${status}`]]}
      onPress={onPress}
    >
      <View style={styles.timeColumn}>
        <Text style={styles.time}>{startTime}</Text>
        <Text style={styles.timeSeparator}>|</Text>
        <Text style={styles.time}>{endTime}</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flexDirection: "row",
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
  },

  // Status variants
  status_planned: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.blockPlanned,
  },
  status_in_progress: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.blockInProgress,
    backgroundColor: theme.colors.primaryLight,
  },
  status_completed: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.blockCompleted,
    opacity: 0.7,
  },
  status_skipped: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.blockSkipped,
    opacity: 0.5,
  },
  status_fixed: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.blockFixed,
    backgroundColor: theme.colors.blockFixed,
  },

  timeColumn: {
    width: 50,
    alignItems: "center",
  },
  time: {
    fontSize: theme.typography.xs,
    color: theme.colors.textSecondary,
  },
  timeSeparator: {
    color: theme.colors.border,
  },
  content: {
    flex: 1,
    paddingLeft: theme.spacing.md,
  },
  title: {
    fontSize: theme.typography.base,
    fontWeight: "600",
    color: theme.colors.text,
  },
}));
```

---

## 13. Performance Optimization

### Timeline Rendering

```typescript
// components/timeline/TimelineView.tsx
import { FlashList } from "@shopify/flash-list";
import { memo, useCallback } from "react";
import { TimeBlock } from "./TimeBlock";

interface Block {
  _id: string;
  title: string;
  startTime: string;
  endTime: string;
  status: string;
}

interface TimelineViewProps {
  blocks: Block[];
  onBlockPress: (blockId: string) => void;
}

// Memoize individual blocks to prevent re-renders
const MemoizedTimeBlock = memo(TimeBlock, (prev, next) => {
  return (
    prev.title === next.title &&
    prev.startTime === next.startTime &&
    prev.endTime === next.endTime &&
    prev.status === next.status
  );
});

export function TimelineView({ blocks, onBlockPress }: TimelineViewProps) {
  // Stable callback reference
  const renderItem = useCallback(({ item }: { item: Block }) => (
    <MemoizedTimeBlock
      title={item.title}
      startTime={item.startTime}
      endTime={item.endTime}
      status={item.status as any}
      onPress={() => onBlockPress(item._id)}
    />
  ), [onBlockPress]);

  const keyExtractor = useCallback((item: Block) => item._id, []);

  return (
    <FlashList
      data={blocks}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      estimatedItemSize={80}
      // Prevent re-renders when data reference changes but content is same
      extraData={blocks.map((b) => `${b._id}-${b.status}`).join(",")}
    />
  );
}
```

### Efficient Convex Queries

```typescript
// convex/blocks.ts

// Use indexes for efficient date-range queries
export const getByDateRange = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, { startDate, endDate }) => {
    const user = await getAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    // Use index to filter at database level
    const blocks = await ctx.db
      .query("blocks")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", user._id)
          .gte("date", startDate)
          .lte("date", endDate)
      )
      .collect();

    return blocks;
  },
});

// Paginated query for large datasets
export const getByDatePaginated = query({
  args: {
    date: v.string(),
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { date, cursor, limit = 20 }) => {
    const user = await getAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    let query = ctx.db
      .query("blocks")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", user._id).eq("date", date)
      );

    const results = await query.paginate({ cursor, numItems: limit });

    return {
      blocks: results.page,
      nextCursor: results.continueCursor,
      isDone: results.isDone,
    };
  },
});
```

### Reducing Re-renders

```typescript
// hooks/useSchedule.ts
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useMemo } from "react";

export function useSchedule(date: string) {
  const rawBlocks = useQuery(api.blocks.getByDate, { date });

  // Memoize derived data
  const schedule = useMemo(() => {
    if (!rawBlocks) return null;

    const sorted = [...rawBlocks].sort((a, b) =>
      a.startTime.localeCompare(b.startTime)
    );

    const stats = {
      total: sorted.length,
      completed: sorted.filter((b) => b.status === "completed").length,
      planned: sorted.filter((b) => b.status === "planned").length,
      inProgress: sorted.filter((b) => b.status === "in_progress").length,
    };

    return { blocks: sorted, stats };
  }, [rawBlocks]);

  return {
    blocks: schedule?.blocks ?? [],
    stats: schedule?.stats ?? { total: 0, completed: 0, planned: 0, inProgress: 0 },
    isLoading: rawBlocks === undefined,
  };
}
```

---

## 14. Testing Strategy

### Unit Testing Convex Functions

```typescript
// convex/blocks.test.ts
import { convexTest } from "convex-test";
import { expect, test, describe } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";

describe("blocks", () => {
  test("create block", async () => {
    const t = convexTest(schema);

    // Create a test user first
    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        authUserId: "test-auth-id",
        email: "test@example.com",
        onboardingCompleted: true,
        preferences: {
          wakeTime: "06:30",
          sleepTime: "23:00",
          peakEnergyWindow: "morning",
          notificationStyle: "proactive",
          timezone: "America/New_York",
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    // Mock auth
    const asUser = t.withIdentity({ subject: "test-auth-id" });

    // Create a block
    const blockId = await asUser.mutation(api.blocks.create, {
      date: "2025-01-15",
      startTime: "09:00",
      endTime: "10:00",
      title: "Test Task",
      source: "user_request",
      requiresTravel: false,
    });

    expect(blockId).toBeDefined();

    // Verify block was created
    const blocks = await asUser.query(api.blocks.getByDate, {
      date: "2025-01-15",
    });

    expect(blocks).toHaveLength(1);
    expect(blocks[0].title).toBe("Test Task");
  });

  test("update block status", async () => {
    const t = convexTest(schema);

    // Setup: create user and block
    const { userId, blockId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        authUserId: "test-auth-id",
        email: "test@example.com",
        onboardingCompleted: true,
        preferences: {
          wakeTime: "06:30",
          sleepTime: "23:00",
          peakEnergyWindow: "morning",
          notificationStyle: "proactive",
          timezone: "America/New_York",
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const blockId = await ctx.db.insert("blocks", {
        userId,
        date: "2025-01-15",
        startTime: "09:00",
        endTime: "10:00",
        title: "Test Task",
        source: "user_request",
        status: "planned",
        requiresTravel: false,
        prepBuffer: 0,
        timesPostponed: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      return { userId, blockId };
    });

    const asUser = t.withIdentity({ subject: "test-auth-id" });

    // Update status
    await asUser.mutation(api.blocks.updateStatus, {
      blockId,
      status: "completed",
    });

    // Verify
    const block = await t.run(async (ctx) => ctx.db.get(blockId));
    expect(block?.status).toBe("completed");
    expect(block?.completedAt).toBeDefined();
  });
});
```

### Testing Scheduling Algorithm

```typescript
// lib/scheduling.test.ts
import { describe, test, expect } from "vitest";
import { findAvailableSlots, findBestSlot, scheduleGoalSessions } from "./scheduling";

describe("findAvailableSlots", () => {
  test("finds gaps between blocks", () => {
    const blocks = [
      { startTime: "08:00", endTime: "12:00", title: "Work", flexibility: "fixed" as const },
      { startTime: "14:00", endTime: "18:00", title: "Work", flexibility: "fixed" as const },
    ];

    const slots = findAvailableSlots(blocks, {
      wakeTime: "06:30",
      sleepTime: "23:00",
      peakEnergyWindow: "morning",
    });

    expect(slots).toHaveLength(3);
    expect(slots[0]).toEqual({ startTime: "06:30", endTime: "08:00", available: true });
    expect(slots[1]).toEqual({ startTime: "12:00", endTime: "14:00", available: true });
    expect(slots[2]).toEqual({ startTime: "18:00", endTime: "23:00", available: true });
  });

  test("respects minimum duration", () => {
    const blocks = [
      { startTime: "08:00", endTime: "08:20", title: "Break", flexibility: "fixed" as const },
    ];

    const slots = findAvailableSlots(blocks, {
      wakeTime: "08:00",
      sleepTime: "23:00",
      peakEnergyWindow: "morning",
    }, 30); // 30 min minimum

    // The 20-minute gap should be excluded
    expect(slots.every((s) => {
      const duration = timeToMinutes(s.endTime) - timeToMinutes(s.startTime);
      return duration >= 30;
    })).toBe(true);
  });
});

describe("findBestSlot", () => {
  test("prefers peak energy window for high-energy tasks", () => {
    const slots = [
      { startTime: "07:00", endTime: "08:00", available: true },
      { startTime: "14:00", endTime: "15:00", available: true },
      { startTime: "20:00", endTime: "21:00", available: true },
    ];

    const best = findBestSlot(slots, 45, {
      preferredTime: "any",
      energyLevel: "high",
      peakEnergyWindow: "morning",
    });

    expect(best?.startTime).toBe("07:00"); // Morning slot
  });

  test("prefers non-peak for low-energy tasks", () => {
    const slots = [
      { startTime: "07:00", endTime: "08:00", available: true },
      { startTime: "20:00", endTime: "21:00", available: true },
    ];

    const best = findBestSlot(slots, 45, {
      preferredTime: "any",
      energyLevel: "low",
      peakEnergyWindow: "morning",
    });

    expect(best?.startTime).toBe("20:00"); // Evening slot (not morning)
  });
});
```

### Mocking ElevenLabs for Development

```typescript
// lib/elevenlabs-mock.ts
export function createMockConversation() {
  let status: "connected" | "disconnected" = "disconnected";
  let onMessageCallback: ((msg: { message: string; source: string }) => void) | null = null;

  return {
    status,
    isSpeaking: false,

    startSession: async (config: any) => {
      status = "connected";

      // Simulate agent greeting after connection
      setTimeout(() => {
        onMessageCallback?.({
          message: "Hey! What would you like to plan today?",
          source: "assistant",
        });
      }, 500);

      return "mock-conversation-id";
    },

    endSession: async () => {
      status = "disconnected";
    },

    sendUserMessage: (text: string) => {
      // Echo user message
      onMessageCallback?.({ message: text, source: "user" });

      // Simulate agent response
      setTimeout(() => {
        const response = mockAgentResponse(text);
        onMessageCallback?.({ message: response, source: "assistant" });
      }, 1000);
    },

    onMessage: (callback: typeof onMessageCallback) => {
      onMessageCallback = callback;
    },
  };
}

function mockAgentResponse(userMessage: string): string {
  const lower = userMessage.toLowerCase();

  if (lower.includes("plan") && lower.includes("tomorrow")) {
    return "Sure! Let me check your schedule for tomorrow. You have work from 8 to 5. Would you like me to add any activities before or after?";
  }

  if (lower.includes("gym")) {
    return "I can add gym to your schedule. What time works best—morning before work or evening after?";
  }

  if (lower.includes("free") || lower.includes("available")) {
    return "You're free from 6 PM onwards. That's about 5 hours until your usual bedtime. What would you like to do?";
  }

  return "I'm here to help you plan your day. What would you like to schedule?";
}
```

### E2E Testing with Maestro

```yaml
# .maestro/onboarding.yaml
appId: com.flowday.app
---
- launchApp

# Sign up flow
- tapOn: "Sign Up"
- inputText:
    id: "email-input"
    text: "test@example.com"
- inputText:
    id: "password-input"
    text: "TestPassword123!"
- tapOn: "Create Account"

# Onboarding flow
- assertVisible: "I'm here to help you plan your days"

# Answer wake time
- assertVisible: "what time do you usually wake up"
- inputText: "6:30"
- tapOn: "Continue"

# Answer sleep time
- assertVisible: "when do you usually go to sleep"
- inputText: "11pm"
- tapOn: "Continue"

# Answer work schedule
- assertVisible: "regular work or study schedule"
- inputText: "8 to 5 weekdays"
- tapOn: "Continue"

# Complete onboarding
- assertVisible: "You're all set"
- tapOn: "Start Planning"

# Verify home screen
- assertVisible: "Today"
- assertVisible: "Plan my day"
```

---

## 15. Security Considerations

### API Key Management

```typescript
// Environment variables (never commit these!)
// .env.local
CONVEX_DEPLOYMENT=your-deployment
ELEVENLABS_API_KEY=sk-...
ELEVENLABS_AGENT_ID=agent-...
GOOGLE_ROUTES_API_KEY=AIza...
BETTER_AUTH_SECRET=random-32-byte-secret

// Expo public vars (safe to expose)
// These are bundled into the app
EXPO_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
EXPO_PUBLIC_CONVEX_SITE_URL=https://your-deployment.convex.site
```

### ElevenLabs Token Generation (Server-Side)

```typescript
// convex/agent.ts
// Never expose your API key to the client!

export const getConversationToken = action({
  args: {},
  handler: async (ctx) => {
    // Verify user is authenticated
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Rate limiting (simple version)
    const user = await ctx.runQuery(internal.users.getByAuthId, {
      authId: identity.subject,
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Generate token server-side
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${process.env.ELEVENLABS_AGENT_ID}`,
      {
        headers: {
          "xi-api-key": process.env.ELEVENLABS_API_KEY!,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to generate conversation token");
    }

    const { token } = await response.json();
    return token;
  },
});
```

### Data Protection

```typescript
// convex/blocks.ts
// Always verify ownership before operations

export const getByDate = query({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const user = await getAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    // Only return blocks for the authenticated user
    return await ctx.db
      .query("blocks")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", user._id).eq("date", date)
      )
      .collect();
  },
});

export const delete_ = mutation({
  args: { blockId: v.id("blocks") },
  handler: async (ctx, { blockId }) => {
    const user = await getAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const block = await ctx.db.get(blockId);

    // Verify ownership
    if (!block || block.userId !== user._id) {
      throw new Error("Block not found");
    }

    await ctx.db.delete(blockId);
  },
});
```

### Voice Data Privacy Notes

ElevenLabs handles voice data according to their privacy policy:
- Audio is processed in real-time and not stored permanently
- Transcriptions may be used for service improvement (can opt out)
- Consider informing users about voice data handling in your privacy policy
- For EU users, verify GDPR compliance with ElevenLabs

---

## 16. Error Handling & Resilience

### Error Boundaries

Wrap key components in error boundaries to prevent crashes from propagating:

```typescript
// components/ErrorBoundary.tsx
import React, { Component, ReactNode } from 'react';
import { View, Text, Pressable } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
    // Optional: Send to error tracking service (Sentry, etc.)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </Text>
          <Pressable style={styles.button} onPress={this.handleRetry}>
            <Text style={styles.buttonText}>Try Again</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.background,
  },
  title: {
    fontSize: theme.typography['2xl'],
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  message: {
    fontSize: theme.typography.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  button: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
  },
  buttonText: {
    color: theme.colors.textInverse,
    fontWeight: '600',
  },
}));
```

### Root Layout with Error Boundary

```typescript
// app/_layout.tsx
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ConvexReactClient } from 'convex/react';
import { ConvexBetterAuthProvider } from '@convex-dev/better-auth/react';
import { authClient } from '@/lib/auth-client';
import { Stack } from 'expo-router';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { ConnectionStatusProvider } from '@/providers/ConnectionStatusProvider';

const convex = new ConvexReactClient(
  process.env.EXPO_PUBLIC_CONVEX_URL!,
  { expectAuth: true }
);

export default function RootLayout() {
  return (
    <ErrorBoundary
      onError={(error) => {
        // Log to error tracking service
        console.error('App error:', error);
      }}
    >
      <ConvexBetterAuthProvider client={convex} authClient={authClient}>
        <ConnectionStatusProvider>
          <OfflineIndicator />
          <Stack />
        </ConnectionStatusProvider>
      </ConvexBetterAuthProvider>
    </ErrorBoundary>
  );
}
```

### Screen-Level Error Boundaries

Wrap individual screens for granular error handling:

```typescript
// app/(tabs)/agent.tsx
import { ErrorBoundary } from '@/components/ErrorBoundary';

function AgentScreenContent() {
  // ... agent screen implementation
}

export default function AgentScreen() {
  return (
    <ErrorBoundary
      fallback={
        <View style={styles.errorFallback}>
          <Text>Voice assistant unavailable</Text>
          <Text>Try restarting the app</Text>
        </View>
      }
    >
      <AgentScreenContent />
    </ErrorBoundary>
  );
}
```

### Offline Indicator

```typescript
// components/OfflineIndicator.tsx
import { useEffect, useState } from 'react';
import { View, Text, Animated } from 'react-native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { StyleSheet } from 'react-native-unistyles';

export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const slideAnim = useState(new Animated.Value(-50))[0];

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const offline = !state.isConnected || !state.isInternetReachable;
      setIsOffline(offline);

      if (offline) {
        setShowBanner(true);
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      } else if (showBanner) {
        // Show "Back online" briefly before hiding
        setTimeout(() => {
          Animated.timing(slideAnim, {
            toValue: -50,
            duration: 300,
            useNativeDriver: true,
          }).start(() => setShowBanner(false));
        }, 2000);
      }
    });

    return unsubscribe;
  }, [showBanner]);

  if (!showBanner) return null;

  return (
    <Animated.View
      style={[
        styles.banner,
        isOffline ? styles.offlineBanner : styles.onlineBanner,
        { transform: [{ translateY: slideAnim }] },
      ]}
    >
      <Text style={styles.bannerText}>
        {isOffline ? '📡 No internet connection' : '✓ Back online'}
      </Text>
      {isOffline && (
        <Text style={styles.subText}>Changes will sync when connected</Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create((theme) => ({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 50, // Account for status bar
    paddingBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    zIndex: 1000,
  },
  offlineBanner: {
    backgroundColor: '#EF4444',
  },
  onlineBanner: {
    backgroundColor: '#22C55E',
  },
  bannerText: {
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
  },
  subText: {
    color: '#FFFFFF',
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.9,
  },
}));
```

### Connection Status Provider (for Voice)

```typescript
// providers/ConnectionStatusProvider.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import NetInfo from '@react-native-community/netinfo';

interface ConnectionStatus {
  isOnline: boolean;
  isVoiceConnected: boolean;
  setVoiceConnected: (connected: boolean) => void;
  connectionQuality: 'good' | 'poor' | 'offline';
}

const ConnectionStatusContext = createContext<ConnectionStatus | null>(null);

export function ConnectionStatusProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [isVoiceConnected, setVoiceConnected] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected ?? false);
    });
    return unsubscribe;
  }, []);

  const connectionQuality: ConnectionStatus['connectionQuality'] =
    !isOnline ? 'offline' : isVoiceConnected ? 'good' : 'poor';

  return (
    <ConnectionStatusContext.Provider
      value={{ isOnline, isVoiceConnected, setVoiceConnected, connectionQuality }}
    >
      {children}
    </ConnectionStatusContext.Provider>
  );
}

export function useConnectionStatus() {
  const context = useContext(ConnectionStatusContext);
  if (!context) {
    throw new Error('useConnectionStatus must be used within ConnectionStatusProvider');
  }
  return context;
}
```

### Voice Connection Status Indicator

```typescript
// components/VoiceConnectionStatus.tsx
import { View, Text } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { useConnectionStatus } from '@/providers/ConnectionStatusProvider';

interface Props {
  status: 'disconnected' | 'connecting' | 'connected';
  isSpeaking: boolean;
}

export function VoiceConnectionStatus({ status, isSpeaking }: Props) {
  const { isOnline } = useConnectionStatus();

  if (!isOnline) {
    return (
      <View style={[styles.container, styles.offline]}>
        <View style={[styles.dot, styles.offlineDot]} />
        <Text style={styles.text}>Offline - Voice unavailable</Text>
      </View>
    );
  }

  if (status === 'disconnected') {
    return null; // Don't show when not in use
  }

  return (
    <View style={[styles.container, status === 'connected' ? styles.connected : styles.connecting]}>
      <View
        style={[
          styles.dot,
          status === 'connected' ? styles.connectedDot : styles.connectingDot,
          isSpeaking && styles.speakingDot,
        ]}
      />
      <Text style={styles.text}>
        {status === 'connecting'
          ? 'Connecting...'
          : isSpeaking
          ? 'Assistant speaking...'
          : 'Listening...'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    alignSelf: 'center',
  },
  connected: {
    backgroundColor: theme.colors.primaryLight,
  },
  connecting: {
    backgroundColor: theme.colors.surface,
  },
  offline: {
    backgroundColor: '#FEE2E2',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: theme.spacing.xs,
  },
  connectedDot: {
    backgroundColor: '#22C55E',
  },
  connectingDot: {
    backgroundColor: '#EAB308',
  },
  offlineDot: {
    backgroundColor: '#EF4444',
  },
  speakingDot: {
    // Pulsing animation handled via Animated API
    opacity: 0.7,
  },
  text: {
    fontSize: theme.typography.sm,
    color: theme.colors.text,
  },
}));
```

### Voice Quota Management

```typescript
// hooks/useVoiceQuota.ts
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useMemo } from 'react';

const FREE_TIER_MINUTES = 15;

export function useVoiceQuota() {
  const user = useQuery(api.users.getCurrent);

  const quota = useMemo(() => {
    if (!user) return null;

    const usage = user.voiceUsage;
    const currentMonth = new Date().toISOString().slice(0, 7); // "2025-01"

    // Reset if new month
    if (!usage || usage.monthStart !== currentMonth) {
      return {
        used: 0,
        limit: FREE_TIER_MINUTES,
        remaining: FREE_TIER_MINUTES,
        percentUsed: 0,
        isExceeded: false,
        isWarning: false,
      };
    }

    const remaining = Math.max(0, FREE_TIER_MINUTES - usage.monthlyMinutesUsed);
    const percentUsed = (usage.monthlyMinutesUsed / FREE_TIER_MINUTES) * 100;

    return {
      used: usage.monthlyMinutesUsed,
      limit: FREE_TIER_MINUTES,
      remaining,
      percentUsed,
      isExceeded: remaining === 0,
      isWarning: remaining <= 3 && remaining > 0,
    };
  }, [user]);

  return {
    quota,
    isLoading: user === undefined,
  };
}
```

```typescript
// components/VoiceQuotaIndicator.tsx
import { View, Text, Pressable } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { useVoiceQuota } from '@/hooks/useVoiceQuota';

interface Props {
  onUpgradePress?: () => void;
}

export function VoiceQuotaIndicator({ onUpgradePress }: Props) {
  const { quota, isLoading } = useVoiceQuota();

  if (isLoading || !quota) return null;

  // Don't show if plenty of quota remaining
  if (quota.remaining > 5) return null;

  return (
    <View style={[styles.container, quota.isExceeded ? styles.exceeded : styles.warning]}>
      <View style={styles.content}>
        <Text style={styles.title}>
          {quota.isExceeded ? '🎙️ Voice Limit Reached' : '⚠️ Low Voice Minutes'}
        </Text>
        <Text style={styles.subtitle}>
          {quota.isExceeded
            ? 'Switch to text chat or upgrade'
            : `${quota.remaining} min remaining this month`}
        </Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBackground}>
          <View
            style={[
              styles.progressBar,
              { width: `${Math.min(100, quota.percentUsed)}%` },
              quota.isExceeded ? styles.progressExceeded : styles.progressWarning,
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {quota.used}/{quota.limit} min
        </Text>
      </View>

      {onUpgradePress && (
        <Pressable style={styles.upgradeButton} onPress={onUpgradePress}>
          <Text style={styles.upgradeText}>Upgrade</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    margin: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
  },
  exceeded: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  warning: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  content: {
    marginBottom: theme.spacing.sm,
  },
  title: {
    fontSize: theme.typography.base,
    fontWeight: '600',
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  progressBackground: {
    flex: 1,
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  progressExceeded: {
    backgroundColor: '#EF4444',
  },
  progressWarning: {
    backgroundColor: '#F59E0B',
  },
  progressText: {
    marginLeft: theme.spacing.sm,
    fontSize: theme.typography.xs,
    color: theme.colors.textSecondary,
  },
  upgradeButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignSelf: 'flex-start',
  },
  upgradeText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: theme.typography.sm,
  },
}));
```

### Voice Quota Exceeded Modal

```typescript
// components/VoiceQuotaExceededModal.tsx
import { Modal, View, Text, Pressable } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSwitchToText: () => void;
  onUpgrade?: () => void;
}

export function VoiceQuotaExceededModal({
  visible,
  onClose,
  onSwitchToText,
  onUpgrade,
}: Props) {
  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.emoji}>🎙️</Text>
          <Text style={styles.title}>Voice Minutes Used Up</Text>
          <Text style={styles.message}>
            You've used all 15 minutes of voice conversation this month.
            You can still chat via text!
          </Text>

          <View style={styles.buttons}>
            <Pressable style={styles.primaryButton} onPress={onSwitchToText}>
              <Text style={styles.primaryButtonText}>Continue with Text</Text>
            </Pressable>

            {onUpgrade && (
              <Pressable style={styles.secondaryButton} onPress={onUpgrade}>
                <Text style={styles.secondaryButtonText}>Upgrade Plan</Text>
              </Pressable>
            )}

            <Pressable style={styles.textButton} onPress={onClose}>
              <Text style={styles.textButtonText}>Maybe Later</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create((theme) => ({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  modal: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 48,
    marginBottom: theme.spacing.md,
  },
  title: {
    fontSize: theme.typography.xl,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  message: {
    fontSize: theme.typography.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
    lineHeight: 22,
  },
  buttons: {
    width: '100%',
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
    fontSize: theme.typography.base,
  },
  secondaryButton: {
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  secondaryButtonText: {
    color: theme.colors.text,
    fontWeight: '600',
    textAlign: 'center',
    fontSize: theme.typography.base,
  },
  textButton: {
    paddingVertical: theme.spacing.sm,
  },
  textButtonText: {
    color: theme.colors.textSecondary,
    textAlign: 'center',
    fontSize: theme.typography.sm,
  },
}));
```

---

## 17. Development Phases

### Phase 1: Core MVP (Weeks 1-4)

**Goal**: Working app with basic planning functionality

**Week 1: Project Setup**
- [x] Initialize Expo project with TypeScript
- [x] Set up Convex backend and schema
- [x] Configure better-auth integration
- [x] Set up react-native-unistyles theming
- [x] Create basic navigation structure (Expo Router)

**Week 2: Authentication & User Management**
- [x] Implement sign-in/sign-up screens
- [x] Create user profile storage in Convex
- [x] Build auth-protected routes
- [x] Test auth flow on iOS and Android

**Week 3: Timeline & Blocks**
- [x] Build TimelineView component with FlashList
- [x] Implement TimeBlock component with status variants
- [x] Create current time indicator
- [x] Implement block CRUD mutations
- [x] Add real-time subscription to blocks
- [x] Build Today/Tomorrow toggle

**Week 4: Basic Agent (Text Only)**
- [x] Set up ElevenLabs account and agent
- [x] Create basic system prompt
- [x] Implement WebSocket connection in `useElevenLabs` hook (direct WebSocket, no SDK)
- [x] Create `getSignedUrl` action in Convex for secure WebSocket auth (with rate limiting)
- [x] Create `getAgentContext` query for dynamic variables
- [x] Build text chat interface UI (`app/(tabs)/agent.tsx`)
- [x] Build client-side tools (getScheduleForDate, addTaskToSchedule) via WebSocket
- [x] Configure `textOnly: true` mode in conversation initiation
- [x] Test end-to-end planning flow on device

> **Note**: We use direct WebSocket API for text mode (Phase 1) to avoid LiveKit/WebRTC build issues.
> Voice mode will be added in Phase 2 after resolving compatibility issues. See [Challenge 7](#challenge-7-livekit-webrtc--react-native-081-compatibility).

**Deliverable**: App where user can sign in, see timeline, and plan via text chat

---

### Phase 2: Voice & Smart Features (Weeks 5-8)

**Goal**: Voice conversations and intelligent scheduling

> **⚠️ Important**: Before starting Week 5, review [Challenge 7: LiveKit WebRTC + React Native 0.81 Compatibility](#challenge-7-livekit-webrtc--react-native-081-compatibility) for known build issues and solutions.

**Week 5: ElevenLabs Voice Integration** ✅ COMPLETED

*Pre-requisite: Resolve LiveKit/WebRTC Build Issues*
- [x] Review Challenge 7 solutions in order
- [x] Try Option 2 (Podfile workaround) first - create `plugins/withLiveKitFix.js`
- [ ] ~~If Option 2 fails, try Option 3 (cocoapods-swift-modular-headers)~~ (Not needed - Option 2 worked!)
- [ ] ~~If Options 2-3 fail, try Option 4 (build from source)~~ (Not needed)
- [x] Document which solution worked in Revision History
- [x] Check upstream repos for any new fixes released since December 2025

*Voice Implementation (after build works)*
- [x] Install and configure React Native SDK (`@elevenlabs/react-native`)
- [x] Implement microphone permission flow
- [x] Build VoiceButton with state indicators
- [ ] Test WebRTC connection on physical devices (not simulator) - *Pending physical device test*
- [x] Handle audio session management
- [x] Add graceful fallback to text mode if voice fails

*Additional implementations:*
- [x] Created `useVoiceAgent` hook with ElevenLabs SDK integration
- [x] Added text/voice mode toggle UI in agent screen
- [x] Implemented voice usage tracking (15 min/month free tier)
- [x] Added `getConversationToken` Convex action for SDK auth

**Week 6: Onboarding Flow** ✅ COMPLETED
- [x] Design conversational onboarding UI
- [x] Implement preference collection (wake/sleep, work, activities)
- [x] Build routine template storage
- [x] Create location saving flow
- [x] Test onboarding end-to-end

*Implementation notes:*
- [x] Created 5-step onboarding flow (welcome, wake time, sleep time, energy, notifications, location)
- [x] Built TimePickerStep, EnergyStep, NotificationStep, LocationStep components
- [x] Added AddressAutocomplete with Google Places API
- [x] Integrated location geocoding and travel time calculation

**Week 7: Locations & Travel Time** ✅ COMPLETED
- [x] Integrate Google Places for address search
- [x] Implement location storage in Convex
- [x] Build Google Routes API action
- [x] Create travel time cache
- [x] Update agent to use travel time in scheduling

*Implementation notes:*
- [x] Created `locations.ts` with CRUD operations and keyword support
- [x] Created `maps.ts` with geocodeAddress and calculateTravelTime actions
- [x] Created `travelTimeCache.ts` for caching travel times
- [x] Agent context includes travel time information for scheduling

**Week 8: Notifications** ✅ COMPLETED
- [x] Set up expo-notifications
- [x] Implement notification categories with actions
- [x] Build notification scheduling logic
- [x] Create notification response handlers
- [x] Test notification flow on devices

*Implementation notes:*
- [x] Created `notifications.ts` with Expo Push API integration
- [x] Created `useNotifications` hook for permission handling and token sync
- [x] Added NotificationPermissionBanner component
- [x] Implemented cron-based notification scheduling (15-minute intervals)
- [x] Notifications include prep buffer and travel time information

**Deliverable**: Full voice conversations, smart notifications with travel awareness ✅

---

### Phase 3: Goals & Intelligence (Weeks 9-12)

**Goal**: Proactive scheduling and progress tracking

**Week 9: Goals System** ✅ COMPLETED
- [x] Build goals data model
- [x] Implement goal creation flow (conversational)
- [x] Create weekly progress tracking
- [x] Update agent to consider goals in scheduling

*Implementation notes:*
- [x] Created `goals.ts` with full CRUD and progress tracking
- [x] Built goals screen with GoalCard, GoalForm, ProgressRing components
- [x] Added goal detail modal (`goal/[id].tsx`)
- [x] Goals include categories (learning/health/career/personal/creative)
- [x] Weekly progress calculation with session tracking

**Week 10: Energy-Based Scheduling** ✅ COMPLETED
- [x] Add energy preferences to user profile
- [x] Update scheduling algorithm for energy matching
- [x] Train agent to respect energy preferences
- [x] Build "lazy mode" suggestions

*Implementation notes:*
- [x] Created `scheduling.ts` with 24-hour energy profiles and presets
- [x] Added energyProfile, lazyModeEnabled, lazyModeUntil to user schema
- [x] Built EnergyProfileEditor component with preset selection and custom editing
- [x] Built LazyModeToggle component with duration picker
- [x] Agent context includes current_energy and energy_schedule
- [x] See WEEK10_PLAN.md for detailed implementation

**Week 11: Routine Population & Crons** ✅ COMPLETED
- [x] Implement daily routine population cron
- [x] Build notification scheduling cron
- [x] Create rollover handling for skipped tasks
- [x] Add pattern detection for postponed tasks

*Implementation notes:*
- [x] Created `scheduler.ts` with block generation from routines
- [x] Created `crons.ts` with scheduled jobs for notifications and block generation
- [x] Added rollover behavior settings (auto_skip, rollover_once, prompt_agent)
- [x] Built RolloverSettings component in settings modal
- [x] Rescheduling tracking in blocks schema

**Week 12: Weekly Review** ✅ COMPLETED
- [x] Design weekly review data model
- [x] Implement insight generation logic
- [x] Build weekly review UI
- [x] Create actionable suggestions from patterns

*Implementation notes:*
- [x] Created `weeklyReview.ts` with getWeeklyReview, getWeeklyInsights, getSuggestions queries
- [x] Built WeeklyReviewModal with week picker and navigation
- [x] Created StatCard, SimpleBarChart, InsightCard, SuggestionCard components
- [x] Analytics include daily completion rates, goal progress, minutes tracked
- [x] Insights cover postponement patterns, energy usage, achievements

**Deliverable**: Intelligent scheduling with goals, energy awareness, and weekly insights ✅

---

### Phase 4: Polish & Launch Prep (Weeks 13-16)

**Goal**: Production-ready app

**Week 13: Performance Optimization**
- [ ] Profile and optimize timeline rendering
- [ ] Audit and optimize Convex queries
- [ ] Reduce bundle size
- [ ] Test on low-end devices

**Week 14: Error Handling & Edge Cases**
- [ ] Implement comprehensive error boundaries
- [ ] Add offline state handling
- [ ] Build retry logic for failed operations
- [ ] Handle voice connection failures gracefully

**Week 15: Testing & QA**
- [ ] Write unit tests for critical functions
- [ ] Create E2E test suite with Maestro
- [ ] Conduct manual testing on multiple devices
- [ ] Fix identified bugs

**Week 16: Launch Preparation**
- [ ] Create App Store assets
- [ ] Write privacy policy (include voice data handling)
- [ ] Set up analytics (optional)
- [ ] Prepare for EAS Build submission

**Deliverable**: App ready for TestFlight/Play Store internal testing

---

## 17. Technical Challenges & Solutions

### Challenge 1: ElevenLabs + Convex Context Sync

**Problem**: How do we pass fresh user context to the ElevenLabs agent each conversation?

**Solution**: Use dynamic variables with `startSession`:
```typescript
const startVoice = async () => {
  // Fetch fresh context from Convex
  const context = await getAgentContext();

  await conversation.startSession({
    conversationToken: token,
    dynamicVariables: {
      user_name: context.userName,
      today_schedule: JSON.stringify(context.todayBlocks),
      goals_summary: context.goalsSummary,
      // ... more context
    },
  });
};
```

The agent's system prompt uses `{{variable_name}}` placeholders that get replaced with these values.

---

### Challenge 2: Client Tool Latency During Voice

**Problem**: When agent calls a tool (e.g., addTask), we need to complete the Convex mutation and update UI without awkward pauses.

**Solution**:
1. Mark tools as non-blocking when possible (agent continues while tool executes)
2. Use optimistic updates in UI
3. For blocking tools (like showPreview), design the prompt to set user expectations

```typescript
clientTools: {
  // Non-blocking: agent continues immediately
  addTaskToSchedule: async (params) => {
    await createBlock(params); // Runs async
    return "Task added"; // Agent gets this and continues
  },

  // Blocking: agent waits for result
  showSchedulePreview: (params) => {
    setPreviewBlocks(params.blocks);
    setShowPreview(true);
    return "Showing preview. Wait for user confirmation.";
    // Agent pauses until we call sendContextualUpdate
  },
}
```

---

### Challenge 3: Offline Behavior

**Problem**: What happens when user loses connection?

**Solution**:
1. **Voice**: Show clear error state, offer text fallback
2. **Data**: Convex handles reconnection automatically; show "Syncing..." indicator
3. **Mutations**: Queue failed mutations locally (Zustand persist) and retry on reconnect

```typescript
// Simple offline detection
import NetInfo from "@react-native-community/netinfo";

export function useOfflineAwareMutation(mutation) {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(!state.isConnected);
    });
    return unsubscribe;
  }, []);

  const execute = async (args) => {
    if (isOffline) {
      // Queue for later
      queueMutation(mutation, args);
      return { queued: true };
    }
    return mutation(args);
  };

  return { execute, isOffline };
}
```

---

### Challenge 4: react-native-unistyles v3 Requirements

**Problem**: Unistyles v3 requires React Native 0.78+ with New Architecture (Fabric).

**Solution**:
- Ensure Expo SDK 54 is using RN 0.78+
- Enable New Architecture in app.json:
  ```json
  {
    "expo": {
      "newArchEnabled": true
    }
  }
  ```
- If issues arise, can fall back to unistyles v2 which supports old architecture

---

### Challenge 5: Text Mode Fallback

**Problem**: Does ElevenLabs support text-only mode with the same agent?

**Solution**: Yes! Use `textOnly: true` in configuration or call `sendUserMessage` without starting audio:

```typescript
const conversation = useConversation({
  textOnly: true, // No audio at all
  // OR start in voice mode but allow text input via sendUserMessage
});

// For text input during voice session:
conversation.sendUserMessage("Add gym tomorrow at 6pm");
```

---

### Challenge 6: better-auth Mobile Token Storage

**Problem**: Where do we securely store auth tokens in React Native?

**Solution**: better-auth client handles this automatically using secure storage. For custom needs:

```typescript
import * as SecureStore from "expo-secure-store";

// better-auth should handle this, but if needed:
const storage = {
  getItem: async (key: string) => SecureStore.getItemAsync(key),
  setItem: async (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: async (key: string) => SecureStore.deleteItemAsync(key),
};
```

---

### Challenge 7: LiveKit WebRTC + React Native 0.81 Compatibility

**Problem**: When building for iOS with Expo SDK 54 (React Native 0.81) and `@livekit/react-native-webrtc`, you get build errors:

```
include of non-modular header inside framework module
'livekit_react_native_webrtc.WebRTCModule':
'/Users/.../React/RCTBridgeModule.h'
[-Werror,-Wnon-modular-include-in-framework-module]
```

This affects multiple files: `RTCVideoViewManager.h`, `RCTConvert+WebRTC.h`, `WebRTCModule.h`, etc.

**Root Cause**:
- CocoaPods uses `use_frameworks!` (required by some Swift dependencies)
- LiveKit's WebRTC fork imports React headers that aren't properly modularized
- Expo SDK 54 ships React Native as precompiled XCFrameworks, changing how headers are resolved
- This is a class of issues affecting multiple RN packages, not just LiveKit

**Research Status** (December 2025):
- No official fix from LiveKit yet for RN 0.81
- The original `react-native-webrtc` is working on New Architecture support in a `new-arch` branch
- Stream's fork (`@stream-io/react-native-webrtc`) claims compatibility via interop layers

**Solutions to Try (in order of preference):**

**Option 1: Use WebSocket for Text Mode (Phase 1 Recommendation)**

Skip the SDK entirely for text-only conversations. See [Phase 1: Direct WebSocket API](#phase-1-direct-websocket-api-text-only-mode).

**Option 2: Podfile Workaround - Allow Non-Modular Includes**

Create an Expo config plugin to modify the Podfile:

```javascript
// plugins/withLiveKitFix.js
const { withPodfile } = require('@expo/config-plugins');

module.exports = function withLiveKitFix(config) {
  return withPodfile(config, async (config) => {
    const postInstallCode = `
    # LiveKit WebRTC modular header fix
    installer.pods_project.targets.each do |target|
      if target.name.include?('livekit') || target.name.include?('WebRTC') || target.name.include?('react-native-webrtc')
        target.build_configurations.each do |build_config|
          build_config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
        end
      end
    end
`;

    // Find post_install and inject our code
    config.modResults.contents = config.modResults.contents.replace(
      /post_install do \|installer\|/,
      `post_install do |installer|${postInstallCode}`
    );

    return config;
  });
};
```

Add to app.json:
```json
{
  "expo": {
    "plugins": [
      "./plugins/withLiveKitFix"
    ]
  }
}
```

Then run `bunx expo prebuild --clean`.

**Option 3: Use cocoapods-swift-modular-headers Plugin**

```ruby
# Gemfile
gem 'cocoapods-swift-modular-headers', :git => 'https://github.com/callstack/cocoapods-swift-modular-headers.git'

# ios/Podfile
plugin 'cocoapods-swift-modular-headers'

pre_install do |installer|
  apply_modular_headers_for_swift_dependencies(installer)
end
```

**Option 4: Build React Native from Source**

In `app.json`:
```json
{
  "expo": {
    "plugins": [
      ["expo-build-properties", {
        "ios": {
          "useFrameworks": "static",
          "buildReactNativeFromSource": true
        }
      }]
    ]
  }
}
```

⚠️ **Warning**: This significantly increases build times (10-20+ minutes for iOS).

**Option 5: Try Stream's WebRTC Fork**

Stream's fork explicitly supports New Architecture via interop layers:

```bash
bunx expo install @stream-io/react-native-webrtc
```

However, this would require forking `@elevenlabs/react-native` to use the different WebRTC package.

**Option 6: Native Bridge Approach (Most Robust)**

Build native modules that wrap ElevenLabs' platform-specific SDKs:
- iOS: [elevenlabs-swift-sdk](https://github.com/elevenlabs/elevenlabs-swift-sdk)
- Android: ElevenLabs Kotlin SDK

This bypasses the JavaScript WebRTC layer entirely but requires significant native development.

**Monitoring for Upstream Fixes:**

- LiveKit RN SDK: https://github.com/livekit/client-sdk-react-native/issues
- LiveKit WebRTC Fork: https://github.com/livekit/react-native-webrtc/issues
- Original react-native-webrtc: https://github.com/react-native-webrtc/react-native-webrtc/issues/1557
- Expo non-modular header issues: https://github.com/expo/expo/issues/39607

**Migration Path**: When voice mode is needed (Phase 2), try options in order. Document what works in the Revision History below.

---

### Limitation: ElevenLabs Free Tier

**Problem**: Free tier only offers 15 minutes/month of voice conversation.

**Solution**:
1. Implement usage tracking in Convex
2. Show remaining minutes to user
3. Text mode as unlimited fallback
4. Clear messaging when limit approached

```typescript
// Track usage in user document
interface UserVoiceUsage {
  monthlyMinutesUsed: number;
  monthStart: string; // "2025-01"
  lastUpdated: number;
}

// Check before starting voice
if (user.voiceUsage.monthlyMinutesUsed >= 15) {
  Alert.alert(
    "Voice Limit Reached",
    "You've used your monthly voice minutes. You can still chat via text!"
  );
  return;
}
```

---

## Summary

This implementation plan provides a comprehensive roadmap for building FlowDay. Key architectural decisions:

1. **ElevenLabs for Voice**: Handles complex voice infrastructure (STT, TTS, turn-taking) while we focus on scheduling logic
2. **Convex for Backend**: Real-time sync, scheduled jobs, and actions for external APIs
3. **better-auth for Auth**: Clean integration with Convex, secure token handling
4. **Dynamic Variables**: Pass fresh user context to agent each conversation
5. **Client-Side Tools**: Enable agent → app actions for seamless planning

The phased approach allows for iterative development:
- Phase 1: Core planning with text
- Phase 2: Voice and smart notifications
- Phase 3: Goals and proactive intelligence
- Phase 4: Polish and launch

Each phase delivers a usable product while building toward the full vision.

---

## Revision History

### December 2025 Updates

The following improvements were made after verification against latest documentation:

#### Authentication (better-auth)
- **Updated to use `@better-auth/expo` plugin** (v1.4.5) for proper React Native support
- Added `expo-secure-store` integration for secure token storage
- Added app scheme configuration for deep linking
- Added `trustedOrigins` configuration for development

#### ElevenLabs Integration
- **Fixed client tools bug**: Changed from using hook results (`await useQuery`) to direct Convex client queries (`convex.query()`)
- Added 60-second timeout for blocking `showSchedulePreview` tool
- Added structured JSON responses with `success` field for error handling
- Updated `onDisconnect` callback to handle reconnection prompts

#### Dynamic Variables
- **Changed format from JSON to simple strings** to avoid size limits
- Dynamic variables only support strings, numbers, and booleans
- Added helper functions: `formatScheduleForAgent()`, `formatGoalsForAgent()`
- Added numeric counters: `today_block_count`, `active_goals_count`

#### Notifications (expo-notifications)
- **Updated trigger format** to use explicit `type` field (SDK 54+ requirement)
- Added `SchedulableTriggerInputTypes.DATE` for date-based triggers
- Added `SchedulableTriggerInputTypes.DAILY` for recurring notifications
- Added past-time check to prevent scheduling notifications for past times

#### Data Validation & Security
- **Added input validation** for dates (YYYY-MM-DD) and times (HH:MM 24-hour)
- **Added block conflict detection** - prevents double-booking
- **Added rate limiting** for ElevenLabs token generation (3 requests/minute)
- Added `deleteBlock` mutation with notification cleanup
- Added `ensureUser` mutation for post-auth user document creation

#### Timezone Handling
- **Fixed timezone-aware date calculation** using `Intl.DateTimeFormat` with `formatToParts()`
- Added `formatDateYYYYMMDD()` helper for cross-environment safe date formatting
- Added `getDatesInTimezone()` helper function
- Dates now correctly reflect user's local timezone, not UTC

#### Schema Updates
- Added `voiceUsage` field for ElevenLabs quota tracking
- Added `tokenRateLimit` field for rate limiting

### December 2025 Updates (Second Review)

The following improvements were made after architectural review:

#### Block Mutations
- **Added `blocks.update` mutation** for editing block details (title, description, times, energy level)
- Includes conflict detection when changing times
- Validates all inputs before updating

#### Error Handling & Resilience
- **Added `ErrorBoundary` component** with retry functionality
- Added screen-level error boundaries for granular error handling
- Added `OfflineIndicator` component with animated banner
- Added `ConnectionStatusProvider` for tracking network and voice connection state
- Added `VoiceConnectionStatus` indicator component

#### Voice Quota Management
- **Added `useVoiceQuota` hook** for tracking monthly voice usage
- Added `VoiceQuotaIndicator` component (shows when <5 min remaining)
- Added `VoiceQuotaExceededModal` for graceful degradation to text mode
- Shows progress bar and upgrade option

#### Rate Limiting (Improved)
- **Changed from timestamp array to sliding window counter** - more efficient
- Schema updated: `tokenRateLimit` now uses `{ count, windowStart }` structure
- Reduces storage overhead and query complexity

#### Timezone Handling (Fixed)
- **Replaced `en-CA` locale hack** with `Intl.DateTimeFormat.formatToParts()`
- Cross-environment safe date formatting guaranteed by spec
- Added explicit `formatDateYYYYMMDD()` helper function

### December 2025 Updates (LiveKit/WebRTC Compatibility Research)

**Problem Identified**: `@livekit/react-native-webrtc` fails to build on iOS with Expo SDK 54 / React Native 0.81 due to "non-modular header inside framework module" errors.

#### Changes Made

**Section 6 - ElevenLabs Voice Integration (Major Restructure)**
- **Split into Phase 1 (WebSocket) and Phase 2 (Full SDK)** approaches
- Added complete `ElevenLabsWebSocket` service class for direct WebSocket connections
- Added `useTextAgent` hook that bypasses LiveKit/WebRTC entirely
- Added `getSignedUrl` Convex action for secure WebSocket authentication
- Phase 1 approach requires zero native modules and works in Expo Go

**Challenge 7 Added - LiveKit WebRTC + React Native 0.81 Compatibility**
- Documented root cause: CocoaPods framework module + non-modular React headers
- Added 6 solution options in order of preference:
  1. WebSocket for text mode (recommended for Phase 1)
  2. Podfile workaround with `CLANG_ALLOW_NON_MODULAR_INCLUDES`
  3. cocoapods-swift-modular-headers plugin
  4. Build React Native from source
  5. Try Stream's WebRTC fork
  6. Native bridge approach (most robust but highest effort)
- Added links to monitor for upstream fixes

**Phase 1 (Week 4) Updated**
- Removed references to `@elevenlabs/react-native` SDK
- Added tasks for WebSocket service implementation
- Added note explaining the approach

**Phase 2 (Week 5) Updated**
- Added prerequisite checklist for resolving build issues
- Added explicit steps to try each workaround option
- Added task to document which solution works

### December 2025 - Week 5 Implementation Complete

**LiveKit/WebRTC Build Issue: RESOLVED**
- **Option 2 (Podfile workaround) worked successfully!**
- Created `apps/mobile/plugins/withLiveKitFix.js` Expo config plugin
- Plugin injects `CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES = YES` for LiveKit/WebRTC targets
- iOS build passes with `expo-build-properties` using `useFrameworks: "static"`

**Files Created:**
- `apps/mobile/plugins/withLiveKitFix.js` - Expo config plugin for Podfile fix
- `apps/mobile/hooks/useVoiceAgent.ts` - Voice conversation hook with ElevenLabs SDK
- `apps/mobile/components/VoiceButton.tsx` - Voice button with state indicators (idle/listening/speaking/processing)

**Files Modified:**
- `apps/mobile/app.json` - Added plugins configuration
- `apps/mobile/app/(tabs)/agent.tsx` - Added text/voice mode toggle UI
- `packages/convex/convex/agent.ts` - Added `getConversationToken` action and `trackVoiceUsage` mutation
- `packages/convex/convex/users.ts` - Added `getCurrentUser` query alias

**Key Implementation Details:**
- Voice mode uses `conversationToken` (JWT) from `/v1/convai/conversation/token` endpoint
- Text mode continues using `signedUrl` (WebSocket URL) from `/get_signed_url` endpoint
- Voice usage tracking: monitors ElevenLabs free tier (15 min/month)
- Graceful fallback: text/voice toggle allows switching modes if voice fails

**Pending:**
- Physical device testing (WebRTC doesn't work in iOS Simulator)

**Sources Section Reorganized**
- Grouped by category (ElevenLabs, LiveKit/WebRTC, Convex, etc.)
- Added new sources from compatibility research:
  - ElevenLabs Chat Mode and Signed URL documentation
  - LiveKit and react-native-webrtc GitHub issues
  - Expo SDK 54 compatibility issues
  - Callstack modular headers solution

---

## Sources

### ElevenLabs
- [ElevenLabs React Native SDK](https://elevenlabs.io/docs/agents-platform/libraries/react-native)
- [ElevenLabs React SDK Documentation](https://elevenlabs.io/docs/agents-platform/libraries/react)
- [ElevenLabs Chat Mode (Text-Only)](https://elevenlabs.io/docs/agents-platform/guides/chat-mode)
- [ElevenLabs Get Signed URL API](https://elevenlabs.io/docs/conversational-ai/api-reference/conversations/get-signed-url)
- [ElevenLabs Dynamic Variables](https://elevenlabs.io/docs/agents-platform/customization/personalization/dynamic-variables)
- [ElevenLabs Prompting Guide](https://elevenlabs.io/docs/agents-platform/best-practices/prompting-guide)
- [ElevenLabs Swift SDK (Native iOS)](https://github.com/elevenlabs/elevenlabs-swift-sdk)

### LiveKit / WebRTC Compatibility Research
- [LiveKit React Native SDK](https://github.com/livekit/client-sdk-react-native)
- [react-native-webrtc New Architecture Discussion](https://github.com/react-native-webrtc/react-native-webrtc/issues/1557)
- [Expo SDK 54 Non-modular Header Issues](https://github.com/expo/expo/issues/39607)
- [Stream WebRTC New Architecture Support](https://getstream.io/video/docs/react-native/setup/installation/react-native/)
- [Callstack cocoapods-swift-modular-headers](https://github.com/callstack/cocoapods-swift-modular-headers)
- [Solving Swift Modular Header Issues - Callstack Blog](https://www.callstack.com/blog/solving-swift-modular-header-issues-in-react-native-for-good)

### Convex
- [Convex React Native Quickstart](https://docs.convex.dev/quickstart/react-native)
- [Convex Database Schemas](https://docs.convex.dev/database/schemas)
- [Convex Database Indexes](https://docs.convex.dev/database/indexes)
- [Convex Actions](https://docs.convex.dev/functions/actions)
- [Convex Cron Jobs](https://docs.convex.dev/scheduling/cron-jobs)

### Authentication
- [better-auth Expo Integration](https://www.better-auth.com/docs/integrations/expo)
- [better-auth Convex Integration](https://www.better-auth.com/docs/integrations/convex)

### Styling & UI
- [react-native-unistyles v3 Getting Started](https://www.unistyl.es/v3/start/getting-started)
- [react-native-unistyles v3 Configuration](https://www.unistyl.es/v3/start/configuration)

### Expo & React Native
- [Expo SDK 54 Changelog](https://expo.dev/changelog/sdk-54)
- [Expo Build Properties](https://docs.expo.dev/versions/latest/sdk/build-properties/)
- [Expo Notifications](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/)
- [React Native New Architecture](https://docs.expo.dev/guides/new-architecture/)

### External APIs
- [Google Routes API computeRouteMatrix](https://developers.google.com/maps/documentation/routes/compute_route_matrix)
