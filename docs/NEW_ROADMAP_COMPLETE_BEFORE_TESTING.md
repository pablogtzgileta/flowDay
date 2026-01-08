# FlowDay Phase 4: Pre-Launch Roadmap

> **Document Purpose:** This document provides comprehensive context for implementing the Phase 4 pre-launch work. Each week block contains detailed task descriptions, file references, technical context, and acceptance criteria. An AI assistant should be able to read this document and create actionable implementation plans.

---

## Table of Contents

1. [Project Context](#project-context)
2. [Current State Summary](#current-state-summary)
3. [User Priorities](#user-priorities)
4. [Week 1-2: Critical Fixes & Dependencies](#week-1-2-critical-fixes--dependencies)
5. [Week 2-3: AI Agent Full Power](#week-2-3-ai-agent-full-power)
6. [Week 3-4: Performance & Architecture](#week-3-4-performance--architecture)
7. [Week 4-5: UI/UX Polish](#week-4-5-uiux-polish)
8. [Week 5-6: Cross-Platform Parity & Testing](#week-5-6-cross-platform-parity--testing)
9. [Phase 5: Post-Launch Roadmap](#phase-5-post-launch-roadmap)
10. [Technical Reference](#technical-reference)

---

## Project Context

### What is FlowDay?

FlowDay is an **AI-first daily planner mobile application** with voice conversation capabilities. Instead of manually managing a calendar, users talk to an AI agent that understands:

- **Energy patterns** - When the user is a morning person vs. night owl (hour-by-hour energy levels)
- **Locations** - Home, office, gym, etc. with travel time calculations between them
- **Goals** - Long-term objectives (learning, health, career) with weekly time targets
- **Routines** - Recurring weekly templates that auto-populate the schedule

### Core Value Proposition

Users say things like "Schedule a gym session tomorrow" and the AI agent finds the optimal time slot based on:
- Current energy levels at that time
- Travel time from previous location
- Existing commitments and conflicts
- Goal progress (prioritizing goals that are behind)

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Mobile App** | React Native + Expo 54 | Cross-platform iOS/Android |
| **Navigation** | Expo Router 6 | File-based routing |
| **Backend** | Convex 1.30.0 | Real-time database + serverless functions |
| **Auth** | Better Auth + @convex-dev/better-auth | Authentication |
| **AI/Voice** | ElevenLabs Agent API | Text and voice conversations |
| **Voice Transport** | LiveKit/WebRTC | Real-time audio streaming |
| **Styling** | React Native Unistyles | Theme-based styling |
| **State** | Zustand (installed but unused) | Client-side state |
| **Lists** | Shopify FlashList | Optimized list rendering |

### Project Structure

```
flow-day/
├── apps/
│   └── mobile/                    # React Native Expo app
│       ├── app/                   # Expo Router screens
│       │   ├── (auth)/            # Sign-in, sign-up
│       │   ├── (onboarding)/      # 5-step onboarding
│       │   ├── (tabs)/            # Main app (Timeline, Goals, Agent)
│       │   └── goal/[id].tsx      # Goal detail modal
│       ├── components/            # Reusable components
│       ├── hooks/                 # Custom hooks (useElevenLabs, useVoiceAgent, etc.)
│       ├── lib/                   # Utilities (auth, notifications, performance)
│       └── styles/                # Unistyles theme
│
├── packages/
│   └── convex/                    # Shared backend
│       └── convex/                # Convex functions
│           ├── schema.ts          # Database schema (254 lines)
│           ├── auth.ts            # Auth configuration
│           ├── users.ts           # User management (311 lines)
│           ├── blocks.ts          # Time blocks CRUD (654 lines)
│           ├── goals.ts           # Goals system (591 lines)
│           ├── agent.ts           # AI agent context & tokens (509 lines)
│           ├── scheduler.ts       # Scheduling logic (783 lines)
│           ├── scheduling.ts      # Energy calculations (541 lines)
│           ├── weeklyReview.ts    # Weekly insights (755 lines)
│           ├── notifications.ts   # Push notifications (300 lines)
│           ├── locations.ts       # Location management (156 lines)
│           ├── maps.ts            # Google Maps integration (320 lines)
│           └── routines.ts        # Weekly templates (436 lines)
│
└── docs/                          # Documentation (this folder)
```

---

## Current State Summary

### Implementation Status

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | Core MVP (Auth, Timeline, Basic Agent) | ✅ Complete |
| Phase 2 | Voice & Smart Features (ElevenLabs, Onboarding, Travel) | ✅ Complete |
| Phase 3 | Goals & Intelligence (Goals, Energy, Weekly Review) | ✅ Complete |
| Phase 4 | Polish & Launch Prep | 🔄 **In Progress** |

### Overall Health Score: 4.3/5

**Strengths:**
- Modern React patterns (100% functional components, proper memoization)
- Well-structured Convex backend with optimized queries
- Comprehensive AI context passed to agent
- Strong auth implementation with secure token storage

**Weaknesses:**
- Outdated dependencies (especially @convex-dev/better-auth)
- AI agent tools incomplete (system prompt references non-existent tools)
- UI not interactive enough (TimeBlocks are read-only)
- No accessibility labels
- Performance opportunities not exploited (Zustand unused, ElevenLabs not lazy)

---

## User Priorities

Based on user input, the following priorities guide this roadmap:

| Priority | Choice | Implication |
|----------|--------|-------------|
| **Timeline** | Flexible (1-2 months) | Can polish thoroughly, add quick-win features |
| **Platform** | Both equally | Must ensure cross-platform parity before launch |
| **AI Scope** | Full power | Implement ALL planned agent tools |
| **Post-launch** | Social/Teams, Advanced AI, Calendar sync | Guides Phase 5 planning |

---

## Week 1-2: Critical Fixes & Dependencies

### Overview

This sprint focuses on fixing breaking issues and updating dependencies that could cause problems. These are foundational fixes that should be completed before any feature work.

---

### Task 1.1: Update @convex-dev/better-auth

**Priority:** Critical
**Estimated Time:** 1 hour
**Risk if Skipped:** Auth may break with Convex updates; missing security patches

**Context:**
The `@convex-dev/better-auth` package is at version 0.9.11 but the latest is 0.10.9. This is a **major version gap** (0.9 → 0.10) which may include breaking changes but also critical fixes.

**Current State:**
```json
// packages/convex/package.json
"@convex-dev/better-auth": "0.9.11"
```

**Files to Modify:**
- `packages/convex/package.json` - Update version
- `packages/convex/convex/auth.ts` - May need API adjustments
- `packages/convex/convex/auth.config.ts` - Check for config changes

**Steps:**
1. Read the changelog for @convex-dev/better-auth 0.10.x
2. Update package.json to `"@convex-dev/better-auth": "^0.10.9"`
3. Run `bun install` in packages/convex
4. Check for TypeScript errors
5. Test auth flow (sign-in, sign-up, session persistence)
6. Verify `requireAuth()` helper still works in all mutations/queries

**Acceptance Criteria:**
- [ ] Package updated to 0.10.9+
- [ ] No TypeScript errors
- [ ] Sign-in flow works
- [ ] Sign-up flow works
- [ ] Protected routes redirect correctly
- [ ] Session persists across app restart

---

### Task 1.2: Update better-auth Versions

**Priority:** Medium
**Estimated Time:** 30 minutes
**Risk if Skipped:** Version mismatch between workspaces could cause subtle bugs

**Context:**
There's a version mismatch in the monorepo:
- Root `package.json`: `"better-auth": "^1.4.5"`
- `apps/mobile/package.json`: `"better-auth": "1.3.34"` (pinned, older)
- `packages/convex/package.json`: `"better-auth": "1.3.34"` (pinned, older)

**Files to Modify:**
- `package.json` (root)
- `apps/mobile/package.json`
- `packages/convex/package.json`

**Steps:**
1. Update all to `"better-auth": "^1.4.9"`
2. Update `"@better-auth/expo": "^1.4.9"` in all locations
3. Run `bun install` at root
4. Test auth client initialization in `apps/mobile/lib/auth-client.ts`

**Acceptance Criteria:**
- [ ] All better-auth packages on same version (1.4.9+)
- [ ] No TypeScript errors
- [ ] Auth client initializes without errors

---

### Task 1.3: Fix System Prompt (Remove Phantom Tools)

**Priority:** Critical
**Estimated Time:** 30 minutes
**Risk if Skipped:** AI agent will reference tools that don't exist, confusing users

**Context:**
The system prompt in `IMPLEMENTATION_PLAN.md` (Section 7) references tools that were planned but never implemented:
- `showSchedulePreview` - Supposed to show confirmation modal for bulk adds
- `getGoalsProgress` - Supposed to check goal progress live
- `calculateTravelTime` - Supposed to calculate travel between locations

The ElevenLabs agent uses this prompt and will try to call these tools, resulting in errors or confused responses.

**Current Location:**
The prompt is likely configured in:
1. ElevenLabs dashboard (agent configuration)
2. Or passed dynamically via `getAgentContext` in `packages/convex/convex/agent.ts`

**Steps:**
1. Identify where the system prompt is configured
2. Remove references to unimplemented tools
3. Add a "Current Limitations" section:
   ```
   ## Current Limitations
   - Cannot reschedule existing blocks (must delete + recreate manually)
   - Cannot create or update goals via conversation
   - Cannot query goal progress dynamically (use context variables)
   - Cannot calculate travel time (use estimates based on location distance)
   - Cannot show bulk preview before confirming
   ```
4. Update tool documentation to match actual implementation

**Acceptance Criteria:**
- [ ] System prompt only references existing tools
- [ ] Limitations section added
- [ ] Agent no longer tries to call non-existent tools

---

### Task 1.4: Wire goalId Through Block Creation

**Priority:** Critical
**Estimated Time:** 1 hour
**Risk if Skipped:** Blocks created via AI won't link to goals, breaking goal progress tracking

**Context:**
The `addTaskToSchedule` tool accepts a `goalId` parameter, but the frontend hooks don't extract and pass it to the Convex mutation.

**Current State (useElevenLabs.ts, ~line 268-279):**
```typescript
case "addTaskToSchedule": {
  const typedParams = params as {
    title: string;
    date: string;
    startTime: string;
    endTime: string;
    requiresTravel?: boolean;
    locationId?: string;
    // goalId is missing here!
  };
  // ...
}
```

**Files to Modify:**
- `apps/mobile/hooks/useElevenLabs.ts` - Add goalId to type and pass to mutation
- `apps/mobile/hooks/useVoiceAgent.ts` - Same fix for voice mode
- Verify `packages/convex/convex/blocks.ts` create mutation accepts goalId

**Steps:**
1. In `useElevenLabs.ts`, add `goalId?: string` to the typedParams type
2. Pass `goalId: typedParams.goalId` to the createBlock mutation
3. Repeat for `useVoiceAgent.ts`
4. Test by asking agent to "schedule a 30-minute learning session for tomorrow"
5. Verify the created block has goalId populated in database

**Acceptance Criteria:**
- [ ] goalId included in tool parameter types
- [ ] goalId passed to createBlock mutation
- [ ] Created blocks have goalId in database when specified
- [ ] Goal progress updates when block is completed

---

### Task 1.5: Fix Conflict Detection for in_progress Blocks

**Priority:** Medium
**Estimated Time:** 30 minutes
**Risk if Skipped:** Users could schedule overlapping blocks while another is running

**Context:**
When checking for scheduling conflicts, the code excludes `moved` and `skipped` blocks, but forgets to exclude `in_progress` blocks. This means a user could schedule a new block that overlaps with a currently running block.

**Current State (blocks.ts, line 249-251):**
```typescript
const potentialConflicts = existingBlocks.filter(
  (b) => b.status !== "moved" && b.status !== "skipped"
);
```

**Fix:**
```typescript
const potentialConflicts = existingBlocks.filter(
  (b) => b.status !== "moved" && b.status !== "skipped" && b.status !== "in_progress"
);
```

Wait, actually re-reading this - we SHOULD check conflicts with in_progress blocks. The issue is the opposite: we should NOT allow scheduling over in_progress blocks. Let me re-check the logic...

Actually, on reflection: if a block is `in_progress`, it IS happening right now. We should NOT exclude it from conflict checking. The current code is correct for `moved` and `skipped` (those blocks aren't happening), but `in_progress` blocks ARE happening and should cause conflicts.

**Re-analysis:** The current code DOES check conflicts with in_progress blocks (it only excludes moved/skipped). The issue flagged may be a false positive. However, verify the logic is correct:

**Steps:**
1. Read the conflict detection logic in `blocks.ts:242-262`
2. Confirm `in_progress` blocks ARE included in conflict checking
3. If they are incorrectly excluded, add them to the filter
4. Add a test case for this scenario

**Acceptance Criteria:**
- [ ] in_progress blocks cause conflicts when overlapped
- [ ] moved and skipped blocks do NOT cause conflicts
- [ ] Conflict error message includes the conflicting block title

---

### Task 1.6: Add Await to Notification Sync

**Priority:** Medium
**Estimated Time:** 15 minutes
**Risk if Skipped:** Notification scheduling errors may be swallowed silently

**Context:**
In the notification sync loop, `scheduleForBlock(block)` is called but not awaited, meaning errors won't be caught.

**Current State (useNotifications.ts, ~line 312):**
```typescript
for (const block of blocks) {
  scheduleForBlock(block); // Missing await!
}
```

**Fix:**
```typescript
for (const block of blocks) {
  await scheduleForBlock(block);
}
```

Or use `Promise.all` for parallel execution:
```typescript
await Promise.all(blocks.map(block => scheduleForBlock(block)));
```

**Files to Modify:**
- `apps/mobile/hooks/useNotifications.ts`

**Acceptance Criteria:**
- [ ] All scheduleForBlock calls are awaited
- [ ] Errors propagate correctly
- [ ] Notification scheduling completes before function returns

---

### Task 1.7: Deduplicate ENERGY_PRESETS

**Priority:** Medium
**Estimated Time:** 30 minutes
**Risk if Skipped:** Code duplication leads to maintenance burden and potential drift

**Context:**
The `ENERGY_PRESETS` constant is defined in two places:
- `packages/convex/convex/users.ts` (lines 67-86)
- `packages/convex/convex/scheduling.ts` (lines 15-34)

**Steps:**
1. Keep the definition in `scheduling.ts` (more appropriate location)
2. Export it: `export const ENERGY_PRESETS = { ... }`
3. Import in `users.ts`: `import { ENERGY_PRESETS } from "./scheduling"`
4. Verify both files work correctly

**Acceptance Criteria:**
- [ ] Single source of truth for ENERGY_PRESETS
- [ ] No TypeScript errors
- [ ] Energy profile selection works in onboarding

---

### Task 1.8: Deduplicate timeToMinutes

**Priority:** Medium
**Estimated Time:** 30 minutes
**Risk if Skipped:** Same as above

**Context:**
The `timeToMinutes` function is duplicated in multiple files:
- `packages/convex/convex/goals.ts` (lines 40-45)
- `packages/convex/convex/blocks.ts` (lines 27-30)
- `packages/convex/convex/scheduling.ts` (lines 43-48)

**Steps:**
1. Create a shared utils file: `packages/convex/convex/utils/time.ts`
2. Move `timeToMinutes` and `timeToHour` functions there
3. Export them
4. Update imports in all files

**Acceptance Criteria:**
- [ ] Single source of truth for time utility functions
- [ ] No TypeScript errors
- [ ] All time calculations work correctly

---

### Task 1.9: Gate Expo Auth Scheme by Environment

**Priority:** Medium
**Estimated Time:** 30 minutes
**Risk if Skipped:** Development-only auth schemes exposed in production

**Context:**
The `trustedOrigins` in auth config includes development URLs like `exp://192.168.*.*:*` which shouldn't be in production.

**Current State (auth.ts, ~line 27):**
```typescript
trustedOrigins: [
  "flowday://",
  "exp://192.168.*.*:*",
  "exp://localhost:*",
],
```

**Fix:**
```typescript
const isDev = process.env.NODE_ENV === 'development';

trustedOrigins: [
  "flowday://",
  ...(isDev ? [
    "exp://192.168.*.*:*",
    "exp://localhost:*",
  ] : []),
],
```

**Acceptance Criteria:**
- [ ] Development URLs only included in development
- [ ] Production build only trusts `flowday://`
- [ ] Auth still works in development

---

## Week 2-3: AI Agent Full Power

### Overview

This sprint implements all the agent tools that were planned but not built. This will transform the agent from a simple "add task" bot to a full scheduling assistant.

---

### Task 2.1: Implement getAvailableSlots Tool

**Priority:** High
**Estimated Time:** 2 hours
**Why Needed:** Agent currently can't query free time before proposing a schedule

**Context:**
Currently, when a user asks "when can I exercise tomorrow?", the agent has to guess based on the schedule context. With this tool, the agent can query available slots and propose specific times.

**Backend Implementation (blocks.ts):**
```typescript
export const getAvailableSlots = query({
  args: {
    date: v.string(),        // "YYYY-MM-DD"
    minDuration: v.number(), // Minimum slot duration in minutes
  },
  handler: async (ctx, { date, minDuration }) => {
    const user = await requireAuth(ctx);

    // Get user's wake/sleep times
    const wakeTime = user.preferences?.wakeTime || "07:00";
    const sleepTime = user.preferences?.sleepTime || "22:00";

    // Get existing blocks for the date
    const blocks = await ctx.db
      .query("blocks")
      .withIndex("by_user_date", q => q.eq("userId", user._id).eq("date", date))
      .filter(q => q.neq(q.field("status"), "moved"))
      .filter(q => q.neq(q.field("status"), "skipped"))
      .collect();

    // Calculate available slots between wake time and sleep time
    // Return: { slots: [{ start: "HH:MM", end: "HH:MM", duration: number }] }
  }
});
```

**Frontend Integration (useElevenLabs.ts):**
```typescript
case "getAvailableSlots": {
  const { date, minDuration } = params as { date: string; minDuration: number };
  const slots = await convex.query(api.blocks.getAvailableSlots, { date, minDuration });
  return { success: true, slots };
}
```

**System Prompt Update:**
```
Tool: getAvailableSlots
Purpose: Find free time slots on a given date
Parameters:
  - date: "YYYY-MM-DD" format
  - minDuration: Minimum slot length in minutes (e.g., 30, 60)
Returns: List of available slots with start time, end time, and duration
Use when: User asks "when can I...", "find time for...", "what's open on..."
```

**Acceptance Criteria:**
- [ ] Query returns available slots between wake/sleep times
- [ ] Slots respect existing blocks (no overlaps)
- [ ] Minimum duration filter works
- [ ] Agent can use tool to propose times
- [ ] Energy levels included in slot response (optional enhancement)

---

### Task 2.2: Implement updateBlock Tool

**Priority:** High
**Estimated Time:** 2 hours
**Why Needed:** Agent can only add blocks, not reschedule existing ones

**Context:**
When a user says "move my gym session to 5pm", the agent currently has no way to do this. With this tool, the agent can update block times, titles, and other properties.

**Backend Implementation (blocks.ts):**
```typescript
export const update = mutation({
  args: {
    blockId: v.id("blocks"),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    locationId: v.optional(v.id("locations")),
    status: v.optional(v.union(
      v.literal("planned"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("skipped"),
      v.literal("moved")
    )),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const block = await ctx.db.get(args.blockId);

    if (!block || block.userId !== user._id) {
      throw new Error("Block not found");
    }

    // If changing time, check for conflicts
    if (args.startTime || args.endTime) {
      // ... conflict detection logic
    }

    await ctx.db.patch(args.blockId, {
      ...(args.startTime && { startTime: args.startTime }),
      ...(args.endTime && { endTime: args.endTime }),
      ...(args.title && { title: args.title }),
      // ... other fields
    });

    return { success: true, blockId: args.blockId };
  }
});
```

**System Prompt Update:**
```
Tool: updateBlock
Purpose: Modify an existing time block
Parameters:
  - blockId: ID of the block to update (from schedule context)
  - startTime: New start time "HH:MM" (optional)
  - endTime: New end time "HH:MM" (optional)
  - title: New title (optional)
  - status: New status (optional)
Use when: User asks to "move", "reschedule", "rename", "update" a block
Important: Get blockId from the schedule context provided to you
```

**Acceptance Criteria:**
- [ ] Can update block time
- [ ] Can update block title
- [ ] Can update block status
- [ ] Conflict detection works for new times
- [ ] Returns error if block not found
- [ ] Agent can use tool to reschedule

---

### Task 2.3: Implement deleteBlock Tool

**Priority:** High
**Estimated Time:** 1 hour
**Why Needed:** Agent can't remove blocks from schedule

**Context:**
When a user says "cancel my 3pm meeting", the agent has no way to remove it. This tool enables deletion.

**Backend Implementation (blocks.ts):**
```typescript
export const deleteBlock = mutation({
  args: {
    blockId: v.id("blocks"),
  },
  handler: async (ctx, { blockId }) => {
    const user = await requireAuth(ctx);
    const block = await ctx.db.get(blockId);

    if (!block || block.userId !== user._id) {
      throw new Error("Block not found");
    }

    await ctx.db.delete(blockId);

    return { success: true, deletedTitle: block.title };
  }
});
```

**Acceptance Criteria:**
- [ ] Can delete blocks by ID
- [ ] Ownership verified before deletion
- [ ] Returns deleted block title for confirmation
- [ ] Agent can use tool to cancel/remove blocks

---

### Task 2.4: Implement getGoalsProgress Tool

**Priority:** High
**Estimated Time:** 2 hours
**Why Needed:** Agent can only see goal summary in context, can't query live progress

**Context:**
The agent receives a goals summary in context, but it's a snapshot. With this tool, the agent can query current progress for specific goals to give accurate recommendations.

**Backend Implementation (goals.ts):**
```typescript
export const getGoalsProgress = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);

    const goals = await ctx.db
      .query("goals")
      .withIndex("by_user_active", q => q.eq("userId", user._id).eq("isActive", true))
      .collect();

    const progressData = await calculateWeeklyProgressBatch(ctx, goals);

    return goals.map((goal, i) => ({
      id: goal._id,
      title: goal.title,
      category: goal.category,
      weeklyTargetMinutes: goal.weeklyTargetMinutes,
      completedMinutes: progressData[i].completedMinutes,
      remainingMinutes: progressData[i].remainingMinutes,
      percentComplete: progressData[i].percentComplete,
      sessionsThisWeek: progressData[i].sessionsCount,
      onTrack: progressData[i].percentComplete >= (new Date().getDay() / 7) * 100,
    }));
  }
});
```

**Acceptance Criteria:**
- [ ] Returns all active goals with progress
- [ ] Includes weekly target, completed, remaining
- [ ] Includes "onTrack" indicator
- [ ] Agent can query and recommend based on progress

---

### Task 2.5: Implement calculateTravelTime Tool

**Priority:** Medium
**Estimated Time:** 2 hours
**Why Needed:** Agent currently guesses travel time, can't calculate accurately

**Context:**
The app already calculates travel times (via Google Maps) and caches them. This tool exposes that functionality to the agent.

**Backend Implementation (agent.ts or maps.ts):**
```typescript
export const getTravelTime = query({
  args: {
    fromLocationId: v.id("locations"),
    toLocationId: v.id("locations"),
  },
  handler: async (ctx, { fromLocationId, toLocationId }) => {
    const user = await requireAuth(ctx);

    // Check cache first
    const cached = await ctx.db
      .query("travelTimeCache")
      .withIndex("by_locations", q =>
        q.eq("fromLocationId", fromLocationId).eq("toLocationId", toLocationId)
      )
      .first();

    if (cached && cached.expiresAt > Date.now()) {
      return {
        travelTimeMinutes: cached.travelTimeMinutes,
        cached: true,
      };
    }

    // If not cached, return estimate or trigger calculation
    return {
      travelTimeMinutes: 30, // Default estimate
      cached: false,
      note: "Estimate - actual time may vary",
    };
  }
});
```

**Acceptance Criteria:**
- [ ] Returns cached travel time if available
- [ ] Returns estimate if not cached
- [ ] Agent can use to plan commute buffer

---

### Task 2.6: Implement showSchedulePreview Tool

**Priority:** Medium
**Estimated Time:** 3 hours
**Why Needed:** When adding multiple blocks, user should see preview before confirming

**Context:**
When a user asks "plan my week with gym on Mon/Wed/Fri", the agent should show a preview before actually creating blocks.

**This is a frontend-heavy feature:**

1. Backend returns proposed blocks (not saved yet)
2. Frontend shows modal with preview
3. User confirms or modifies
4. On confirm, backend creates all blocks

**Backend Implementation (agent.ts):**
```typescript
export const createSchedulePreview = action({
  args: {
    blocks: v.array(v.object({
      title: v.string(),
      date: v.string(),
      startTime: v.string(),
      endTime: v.string(),
      // ... other fields
    })),
  },
  handler: async (ctx, { blocks }) => {
    // Validate all blocks
    // Check for conflicts
    // Return preview with any warnings
    return {
      blocks: blocks.map(b => ({
        ...b,
        hasConflict: checkConflict(b),
        conflictWith: getConflictingBlock(b),
      })),
      canConfirm: !blocks.some(b => b.hasConflict),
    };
  }
});
```

**Frontend Implementation:**
- New component: `SchedulePreviewModal.tsx`
- Shows list of proposed blocks
- Highlights conflicts
- Confirm/Cancel buttons
- On confirm, calls `createBulkBlocks` mutation

**Acceptance Criteria:**
- [ ] Agent can propose multiple blocks at once
- [ ] Preview modal shows all proposed blocks
- [ ] Conflicts highlighted
- [ ] User can confirm or cancel
- [ ] On confirm, all blocks created atomically

---

### Task 2.7: Update System Prompt with All New Tools

**Priority:** High
**Estimated Time:** 1 hour
**Why Needed:** Agent needs to know about new capabilities

**Steps:**
1. Document all new tools with:
   - Name and purpose
   - Parameters (with types and examples)
   - Return values
   - When to use
   - Example conversation flow

2. Update limitations section to reflect new capabilities

3. Add example conversations demonstrating new tools

**Acceptance Criteria:**
- [ ] All tools documented in system prompt
- [ ] Examples for each tool
- [ ] Agent successfully uses new tools in conversation

---

### Task 2.8: Fix Voice Quota Rounding

**Priority:** Medium
**Estimated Time:** 30 minutes
**Why Needed:** Current rounding charges 1 minute for 1 second of voice

**Current State (useVoiceAgent.ts):**
```typescript
const durationMinutes = Math.ceil(durationMs / 60000);
```

**Fix:**
```typescript
// Round to nearest 0.1 minute, minimum 0.1
const durationMinutes = Math.max(0.1, Math.round(durationMs / 6000) / 10);
```

Or for simpler billing:
```typescript
// Round to nearest minute, minimum 1
const durationMinutes = Math.max(1, Math.round(durationMs / 60000));
```

**Acceptance Criteria:**
- [ ] Short sessions (< 30s) don't consume full minute
- [ ] Usage tracking more accurate
- [ ] Users get fair quota usage

---

## Week 3-4: Performance & Architecture

### Overview

This sprint focuses on optimizing performance, implementing proper state management, and addressing architectural technical debt.

---

### Task 3.1: Optimize Agent Context Query

**Priority:** High
**Estimated Time:** 1 hour
**Impact:** 40-100ms faster agent context loading

**Context:**
The `getAgentContext` query in `agent.ts` has an N+1 query pattern when fetching travel times for locations.

**Current State (agent.ts, lines 208-223):**
```typescript
for (const fromLoc of locations) {
  const travelTimes = await ctx.db
    .query("travelTimeCache")
    .withIndex("by_locations", (q) => q.eq("fromLocationId", fromLoc._id))
    .collect();
  // ... process each
}
```

**Optimized:**
```typescript
// Fetch all travel times at once
const allTravelTimes = await ctx.db
  .query("travelTimeCache")
  .collect();

// Filter in memory
const locationIds = new Set(locations.map(l => l._id));
const relevantTravelTimes = allTravelTimes.filter(
  tt => locationIds.has(tt.fromLocationId) && locationIds.has(tt.toLocationId)
);
```

**Acceptance Criteria:**
- [ ] Single query instead of N queries
- [ ] Same data returned
- [ ] Measurable performance improvement

---

### Task 3.2: Implement Message Windowing

**Priority:** High
**Estimated Time:** 1 hour
**Impact:** Prevent memory leak in long conversations

**Context:**
The message array in `useElevenLabs.ts` grows unboundedly. In long conversations (100+ messages), this causes memory issues.

**Current State:**
```typescript
const [messages, setMessages] = useState<Message[]>([]);
// Messages accumulate forever
```

**Fix:**
```typescript
const MAX_MESSAGES = 100;

const addMessage = useCallback((message: Message) => {
  setMessages(prev => {
    const updated = [...prev, message];
    // Keep only last 100 messages
    return updated.slice(-MAX_MESSAGES);
  });
}, []);
```

**Acceptance Criteria:**
- [ ] Message array capped at 100 messages
- [ ] Oldest messages removed when limit exceeded
- [ ] No memory growth in long conversations

---

### Task 3.3: Migrate Agent FlatList to FlashList

**Priority:** Medium
**Estimated Time:** 30 minutes
**Impact:** 5-10% smoother scroll in agent chat

**Context:**
The agent chat screen uses React Native's FlatList instead of Shopify's FlashList, which is already used elsewhere in the app.

**Current State (agent.tsx, ~line 216):**
```typescript
<FlatList
  data={messages}
  renderItem={renderMessage}
  // ...
/>
```

**Fix:**
```typescript
import { FlashList } from "@shopify/flash-list";

<FlashList
  data={messages}
  renderItem={renderMessage}
  estimatedItemSize={80}
  // ...
/>
```

**Acceptance Criteria:**
- [ ] Agent chat uses FlashList
- [ ] Estimated item size set appropriately
- [ ] Smooth scrolling with 100+ messages

---

### Task 3.4: Lazy Load ElevenLabsProvider

**Priority:** Medium
**Estimated Time:** 30 minutes
**Impact:** 500-700ms faster app startup

**Context:**
ElevenLabsProvider is imported and rendered in the root layout, even though voice features aren't used until the agent tab.

**Current State (_layout.tsx):**
```typescript
import { ElevenLabsProvider } from "@elevenlabs/react-native";

export default function RootLayout() {
  return (
    <ElevenLabsProvider>
      {/* ... */}
    </ElevenLabsProvider>
  );
}
```

**Fix:**
Only wrap with ElevenLabsProvider when on agent screen, or lazy load it.

**Acceptance Criteria:**
- [ ] ElevenLabs bundle not loaded on app start
- [ ] Voice features still work when accessed
- [ ] Startup time measurably improved

---

### Task 3.5: Implement Zustand Stores

**Priority:** Medium
**Estimated Time:** 2 hours
**Impact:** Better state management, fewer re-renders

**Context:**
Zustand is installed but completely unused. The app relies on local useState which causes unnecessary re-renders and lost state on navigation.

**Recommended Stores:**

**1. agentStore (apps/mobile/stores/agentStore.ts):**
```typescript
import { create } from 'zustand';

interface AgentState {
  inputMode: 'text' | 'voice';
  messages: Message[];
  isConnected: boolean;
  setInputMode: (mode: 'text' | 'voice') => void;
  addMessage: (message: Message) => void;
  clearMessages: () => void;
}

export const useAgentStore = create<AgentState>((set) => ({
  inputMode: 'text',
  messages: [],
  isConnected: false,
  setInputMode: (mode) => set({ inputMode: mode }),
  addMessage: (message) => set((state) => ({
    messages: [...state.messages.slice(-99), message],
  })),
  clearMessages: () => set({ messages: [] }),
}));
```

**2. uiStore (apps/mobile/stores/uiStore.ts):**
```typescript
interface UIState {
  showCreateGoalModal: boolean;
  showSettingsModal: boolean;
  setShowCreateGoalModal: (show: boolean) => void;
  setShowSettingsModal: (show: boolean) => void;
}
```

**Acceptance Criteria:**
- [ ] agentStore implemented and used in agent screen
- [ ] uiStore implemented and used for modals
- [ ] Messages persist across tab navigation
- [ ] Fewer re-renders (measure with React DevTools)

---

### Task 3.6: Add Query Caching for Goals/Energy

**Priority:** Medium
**Estimated Time:** 1 hour
**Impact:** 50% fewer calculations on repeat access

**Context:**
Expensive calculations like goal progress and energy schedules are recalculated on every query. These could be cached with a short TTL.

**Options:**
1. Use `useMemo` in frontend for derived data
2. Add caching layer in Convex (harder with real-time)
3. Use React Query with Convex adapter

**Recommended Approach:**
Frontend memoization for now:
```typescript
const goalsWithProgress = useMemo(() => {
  if (!goals) return [];
  return goals.map(g => ({
    ...g,
    progress: calculateProgress(g),
  }));
}, [goals]);
```

**Acceptance Criteria:**
- [ ] Goal progress not recalculated on every render
- [ ] Energy schedule cached appropriately
- [ ] Real-time updates still work

---

## Week 4-5: UI/UX Polish

### Overview

This sprint focuses on making the app more interactive, accessible, and polished.

---

### Task 4.1: Make TimeBlocks Interactive

**Priority:** High
**Estimated Time:** 3 hours
**Why Needed:** Blocks are currently read-only; users can't interact with them

**Context:**
TimeBlock components in the timeline are purely visual. Users expect to:
- Tap to see details
- Long press for quick actions
- Swipe to complete/skip

**Implementation:**

**File:** `apps/mobile/components/timeline/TimeBlock.tsx`

```typescript
<Pressable
  onPress={() => onPress?.(block._id)}
  onLongPress={() => onLongPress?.(block._id)}
  style={({ pressed }) => [
    styles.container,
    pressed && styles.pressed,
  ]}
>
  {/* Existing content */}
</Pressable>
```

**Parent Integration (index.tsx):**
```typescript
const handleBlockPress = useCallback((blockId: Id<"blocks">) => {
  // Show bottom sheet with block details and actions
  setSelectedBlockId(blockId);
  setShowBlockSheet(true);
}, []);

const handleBlockLongPress = useCallback((blockId: Id<"blocks">) => {
  // Show quick action menu (Complete, Skip, Edit, Delete)
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  setSelectedBlockId(blockId);
  setShowQuickActions(true);
}, []);
```

**Acceptance Criteria:**
- [ ] Tap opens block detail sheet
- [ ] Long press shows quick action menu
- [ ] Visual feedback on press (opacity/scale)
- [ ] Actions work (complete, skip, edit, delete)

---

### Task 4.2: Add Swipe Gestures

**Priority:** High
**Estimated Time:** 2 hours
**Why Needed:** Standard mobile UX pattern for quick actions

**Implementation:**

Use `react-native-gesture-handler` Swipeable component.

**For Goals (goals.tsx):**
```typescript
import Swipeable from 'react-native-gesture-handler/Swipeable';

const renderRightActions = () => (
  <View style={styles.deleteAction}>
    <Text style={styles.deleteText}>Delete</Text>
  </View>
);

<Swipeable
  renderRightActions={renderRightActions}
  onSwipeableOpen={() => handleDeleteGoal(goal._id)}
>
  <GoalCard goal={goal} />
</Swipeable>
```

**For Timeline Blocks:**
- Swipe right: Complete
- Swipe left: Skip

**Acceptance Criteria:**
- [ ] Goals can be deleted with swipe
- [ ] Blocks can be completed/skipped with swipe
- [ ] Smooth animation
- [ ] Haptic feedback

---

### Task 4.3: Replace Emoji Tab Icons

**Priority:** High
**Estimated Time:** 1 hour
**Why Needed:** Emojis aren't accessible; screen readers read them poorly

**Current State:**
```typescript
tabBarIcon: ({ focused }) => (
  <Text>{focused ? '📅' : '📆'}</Text>
)
```

**Fix:**
Use proper icon library (expo-vector-icons or custom SVGs).

```typescript
import { Ionicons } from '@expo/vector-icons';

tabBarIcon: ({ focused, color }) => (
  <Ionicons
    name={focused ? 'calendar' : 'calendar-outline'}
    size={24}
    color={color}
  />
)
```

**Icon Mapping:**
- Timeline: `calendar` / `calendar-outline`
- Goals: `flag` / `flag-outline`
- Agent: `chatbubble` / `chatbubble-outline`

**Acceptance Criteria:**
- [ ] All tab icons use vector icons
- [ ] Icons have proper accessibility labels
- [ ] Focused/unfocused states clear

---

### Task 4.4: Add Accessibility Labels

**Priority:** High
**Estimated Time:** 2 hours
**Why Needed:** App is not accessible to screen reader users

**Areas to Cover:**

1. **Tab Bar:**
```typescript
tabBarAccessibilityLabel: "Today's Schedule"
```

2. **Interactive Components:**
```typescript
<Pressable
  accessibilityRole="button"
  accessibilityLabel="Create new goal"
  accessibilityHint="Opens goal creation form"
>
```

3. **Status Indicators:**
```typescript
<View
  accessibilityLabel={`Block status: ${status}`}
  accessibilityRole="text"
>
```

4. **Voice Button:**
```typescript
<Pressable
  accessibilityLabel={isListening ? "Stop listening" : "Start voice input"}
  accessibilityRole="button"
>
```

**Acceptance Criteria:**
- [ ] All interactive elements have accessibility labels
- [ ] Screen reader can navigate entire app
- [ ] Status changes announced
- [ ] Forms are accessible

---

### Task 4.5: Add Haptic Feedback

**Priority:** Medium
**Estimated Time:** 1 hour
**Why Needed:** Tactile feedback improves UX

**Implementation:**
```typescript
import * as Haptics from 'expo-haptics';

// On button press
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

// On success
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

// On error
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

// On selection change
Haptics.selectionAsync();
```

**Where to Add:**
- Tab switches
- Button presses
- Goal creation success
- Block completion
- Voice mode toggle
- Long press actions

**Acceptance Criteria:**
- [ ] Haptics on key interactions
- [ ] Different feedback types for different actions
- [ ] Respects system haptic settings

---

### Task 4.6: Implement Skeleton Loading States

**Priority:** Medium
**Estimated Time:** 2 hours
**Why Needed:** Spinners feel slower than skeleton loaders

**Implementation:**

Create reusable skeleton components:

```typescript
// components/ui/Skeleton.tsx
export function Skeleton({ width, height, borderRadius = 4 }) {
  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width, height, borderRadius },
      ]}
    />
  );
}

// Pulse animation
const pulseAnim = useRef(new Animated.Value(0.3)).current;
```

**Use Cases:**
- Timeline loading: Show 3-4 skeleton blocks
- Goals loading: Show 2-3 skeleton cards
- Agent connecting: Show skeleton message bubbles

**Acceptance Criteria:**
- [ ] Skeleton components for blocks, cards, messages
- [ ] Pulse animation
- [ ] Used instead of spinners where appropriate

---

### Task 4.7: Improve Empty States with CTAs

**Priority:** Medium
**Estimated Time:** 1 hour
**Why Needed:** Empty states should guide users to action

**Current Empty State (Timeline):**
```typescript
<Text>No blocks scheduled</Text>
<Text>Chat with the AI to plan your day</Text>
```

**Improved:**
```typescript
<View style={styles.emptyContainer}>
  <Ionicons name="calendar-outline" size={64} color={theme.colors.textSecondary} />
  <Text style={styles.emptyTitle}>No blocks scheduled</Text>
  <Text style={styles.emptySubtitle}>
    Your day is open. Let the AI help you plan it.
  </Text>
  <Pressable
    style={styles.emptyButton}
    onPress={() => router.push('/(tabs)/agent')}
  >
    <Text style={styles.emptyButtonText}>Plan with AI</Text>
  </Pressable>
</View>
```

**Acceptance Criteria:**
- [ ] All empty states have icons
- [ ] All empty states have CTAs
- [ ] CTAs navigate to relevant action

---

### Task 4.8: Add Goal Templates

**Priority:** Low
**Estimated Time:** 2 hours
**Why Needed:** Reduces friction in goal creation

**Implementation:**

Add template selection before custom form:

```typescript
const GOAL_TEMPLATES = [
  {
    title: "Daily Exercise",
    category: "health",
    weeklyTargetMinutes: 180, // 3 hours
    preferredSessionMinutes: 45,
    energyLevel: "high",
    icon: "💪",
  },
  {
    title: "Reading",
    category: "learning",
    weeklyTargetMinutes: 300, // 5 hours
    preferredSessionMinutes: 30,
    energyLevel: "medium",
    icon: "📚",
  },
  // ... more templates
];
```

**UI:**
Show template cards at top of GoalForm, tapping one pre-fills the form.

**Acceptance Criteria:**
- [ ] 5+ goal templates available
- [ ] Templates cover each category
- [ ] Tapping template pre-fills form
- [ ] User can still customize after selection

---

## Week 5-6: Cross-Platform Parity & Testing

### Overview

This sprint ensures the app works equally well on iOS and Android, and adds basic test coverage.

---

### Task 5.1: iOS-Specific Testing & Polish

**Priority:** High
**Estimated Time:** 4 hours

**Areas to Test:**
- [ ] Onboarding flow on iPhone SE (small screen)
- [ ] Onboarding flow on iPhone 15 Pro Max (large screen)
- [ ] Timeline scrolling performance
- [ ] Voice recording permissions
- [ ] Push notification permissions
- [ ] Keyboard handling in agent chat
- [ ] Safe area handling (notch, home indicator)
- [ ] Dark mode appearance
- [ ] Dynamic type (accessibility text sizes)

**Known iOS-Specific Issues to Address:**
- Audio session configuration for voice
- Keyboard avoiding view behavior
- Status bar appearance in dark mode

---

### Task 5.2: Android-Specific Testing & Polish

**Priority:** High
**Estimated Time:** 4 hours

**Areas to Test:**
- [ ] Navigation bar handling (gesture nav vs. buttons)
- [ ] Back button behavior
- [ ] Notification channels
- [ ] Permission request flows
- [ ] Edge-to-edge display
- [ ] Various screen sizes (phone, tablet)
- [ ] Voice recording on different devices
- [ ] Keyboard handling

**Known Android-Specific Issues:**
- Edge-to-edge configuration
- Notification channel setup
- Hardware back button handling

---

### Task 5.3: Add Unit Tests for Critical Functions

**Priority:** Medium
**Estimated Time:** 4 hours

**Functions to Test:**

**Backend (Convex):**
- `timeToMinutes` / `timeToHour` utilities
- `calculateNotifyAt` - notification timing logic
- `checkConflict` - block conflict detection
- `getEnergyLevelForHour` - energy calculation
- `calculateWeeklyProgressBatch` - goal progress

**Frontend:**
- Date formatting functions
- Time parsing utilities
- Energy level display logic

**Test Setup:**
```typescript
// packages/convex/convex/utils/time.test.ts
import { describe, test, expect } from "bun:test";
import { timeToMinutes, timeToHour } from "./time";

describe("timeToMinutes", () => {
  test("converts 09:30 to 570", () => {
    expect(timeToMinutes("09:30")).toBe(570);
  });

  test("handles midnight", () => {
    expect(timeToMinutes("00:00")).toBe(0);
  });
});
```

**Acceptance Criteria:**
- [ ] Core utility functions have tests
- [ ] Conflict detection has tests
- [ ] Tests run with `bun test`
- [ ] 80%+ coverage on critical functions

---

### Task 5.4: E2E Test for Core Flows

**Priority:** Medium
**Estimated Time:** 4 hours

**Flows to Test:**
1. **Sign Up Flow:**
   - Navigate to sign-up
   - Enter credentials
   - Complete onboarding
   - Arrive at timeline

2. **Goal Creation Flow:**
   - Navigate to goals tab
   - Tap create button
   - Fill form
   - Submit
   - Verify goal appears

3. **Agent Interaction:**
   - Navigate to agent tab
   - Send text message
   - Receive response
   - Verify message appears

**Tool Options:**
- Maestro (recommended for React Native)
- Detox
- Manual test checklist

**Acceptance Criteria:**
- [ ] Core flows have E2E coverage
- [ ] Tests can run in CI
- [ ] Documentation for running tests

---

### Task 5.5: App Store Assets

**Priority:** High
**Estimated Time:** 3 hours

**Required Assets:**
- [ ] App icon (1024x1024)
- [ ] Screenshots (6.5" and 5.5" iPhones)
- [ ] App description (short and long)
- [ ] Keywords
- [ ] Privacy policy URL
- [ ] Support URL

**Screenshot Scenes:**
1. Timeline with blocks
2. Goals with progress
3. AI agent conversation
4. Voice mode
5. Weekly review
6. Onboarding (optional)

**Acceptance Criteria:**
- [ ] All required assets created
- [ ] Screenshots show key features
- [ ] Description is compelling
- [ ] Privacy policy written

---

### Task 5.6: Play Store Assets

**Priority:** High
**Estimated Time:** 3 hours

**Required Assets:**
- [ ] App icon (512x512)
- [ ] Feature graphic (1024x500)
- [ ] Screenshots (phone and tablet)
- [ ] Short description (80 chars)
- [ ] Full description (4000 chars)
- [ ] Content rating questionnaire
- [ ] Privacy policy URL

**Acceptance Criteria:**
- [ ] All required assets created
- [ ] Feature graphic compelling
- [ ] Content rating completed
- [ ] Ready for submission

---

## Phase 5: Post-Launch Roadmap

Based on user priorities, here's the post-launch direction:

### 5A: Calendar Sync (Month 2)

**Goal:** Bi-directional sync with Google Calendar

**Features:**
- OAuth integration with Google
- Import existing events as "external" blocks
- Export FlowDay blocks to Google Calendar
- Show external events as busy time
- Conflict detection across calendars

**Technical Considerations:**
- Google Calendar API integration
- OAuth token storage and refresh
- Sync scheduling (real-time vs. periodic)
- Conflict resolution UI

---

### 5B: Advanced AI (Month 2-3)

**Goal:** Proactive, intelligent scheduling assistance

**Features:**
- **Morning Briefing:** Daily summary pushed at wake time
- **Proactive Suggestions:** "You have a gap at 2pm, want to schedule goal X?"
- **Pattern Learning:** "You skip afternoon tasks often, want to adjust?"
- **Predictive Completion:** "At current pace, you'll finish this goal by X"
- **Auto-Rescheduling:** When a block runs over, suggest moving subsequent blocks

**Technical Considerations:**
- Background job for morning briefing
- ML model for pattern detection (could use Claude)
- Push notification integration
- User preference for proactivity level

---

### 5C: Social/Teams (Month 3-4)

**Goal:** Accountability and collaboration features

**Features:**
- **Accountability Partners:** Pair with friend/family
- **Progress Sharing:** Weekly summary visible to partner
- **Reactions:** Partner can react to completed goals
- **Team Goals:** Shared goals for families/teams
- **Challenges:** Weekly competitions

**Technical Considerations:**
- User relationship model (partners, teams)
- Privacy controls
- Notification preferences for social
- Team billing model

---

## Technical Reference

### Key Files Quick Reference

| Area | File | Lines |
|------|------|-------|
| Auth | `packages/convex/convex/auth.ts` | ~100 |
| Users | `packages/convex/convex/users.ts` | 311 |
| Blocks | `packages/convex/convex/blocks.ts` | 654 |
| Goals | `packages/convex/convex/goals.ts` | 591 |
| Agent | `packages/convex/convex/agent.ts` | 509 |
| Scheduling | `packages/convex/convex/scheduling.ts` | 541 |
| Voice Hook | `apps/mobile/hooks/useVoiceAgent.ts` | 450+ |
| Text Hook | `apps/mobile/hooks/useElevenLabs.ts` | 400+ |
| Timeline | `apps/mobile/app/(tabs)/index.tsx` | 250+ |
| Goals Screen | `apps/mobile/app/(tabs)/goals.tsx` | 170+ |
| Agent Screen | `apps/mobile/app/(tabs)/agent.tsx` | 300+ |

### Database Schema Overview

```typescript
// users: User profiles and preferences
{
  authUserId: string,
  email: string,
  name?: string,
  preferences: {
    wakeTime: string,      // "HH:MM"
    sleepTime: string,     // "HH:MM"
    timezone: string,
    notificationStyle: "minimal" | "proactive",
    energyProfile: "morning_person" | "night_owl" | "steady" | "custom",
    customEnergyLevels?: number[], // 24 hours
    lazyModeUntil?: number,
    rolloverBehavior: "auto_skip" | "rollover_once" | "prompt_agent",
  },
  onboardingCompleted: boolean,
  voiceUsage: {
    monthlyMinutesUsed: number,
    monthStart: string,
    conversationCount: number,
  },
}

// blocks: Scheduled time blocks
{
  userId: Id<"users">,
  date: string,           // "YYYY-MM-DD"
  startTime: string,      // "HH:MM"
  endTime: string,        // "HH:MM"
  title: string,
  description?: string,
  status: "planned" | "in_progress" | "completed" | "skipped" | "moved",
  goalId?: Id<"goals">,
  locationId?: Id<"locations">,
  requiresTravel: boolean,
  travelTimeMinutes?: number,
  energyLevel: "high" | "medium" | "low",
  notifyAt?: number,      // timestamp
}

// goals: User goals with tracking
{
  userId: Id<"users">,
  title: string,
  category: "learning" | "health" | "career" | "personal" | "creative",
  weeklyTargetMinutes: number,
  preferredSessionMinutes: number,
  preferredTimeOfDay?: "morning" | "afternoon" | "evening" | "any",
  energyLevel: "high" | "medium" | "low",
  priority: 1 | 2 | 3 | 4 | 5,
  isActive: boolean,
}

// locations: Saved locations
{
  userId: Id<"users">,
  label: string,
  address: string,
  latitude: number,
  longitude: number,
  isDefault: boolean,
  keywords: string[],     // For AI recognition
}

// travelTimeCache: Cached travel calculations
{
  fromLocationId: Id<"locations">,
  toLocationId: Id<"locations">,
  travelTimeMinutes: number,
  expiresAt: number,      // 24h TTL
}
```

### Environment Variables

**Backend (packages/convex/.env.local):**
```
CONVEX_DEPLOYMENT=...
ELEVENLABS_API_KEY=...
ELEVENLABS_AGENT_ID=...
GOOGLE_ROUTES_API_KEY=...
```

**Mobile (apps/mobile/.env.local):**
```
EXPO_PUBLIC_CONVEX_URL=...
EXPO_PUBLIC_CONVEX_SITE_URL=...
```

---

*This document should be updated as tasks are completed and new requirements emerge.*
