# FlowDay Web App - Comprehensive Implementation Plan

This document outlines all issues, missing features, and improvements needed for the web application to achieve feature parity with mobile and be production-ready.

---

## Table of Contents

1. [Critical Issues (P0)](#1-critical-issues-p0)
2. [Configuration Fixes (P1)](#2-configuration-fixes-p1)
3. [Authentication Improvements (P2)](#3-authentication-improvements-p2)
4. [Missing Features (P3)](#4-missing-features-p3)
5. [Version Updates (P4)](#5-version-updates-p4)
6. [Best Practices & Polish (P5)](#6-best-practices--polish-p5)

---

## 1. Critical Issues (P0)

These must be fixed before deployment.

### 1.1 Fix TypeScript Errors

**Files affected:**
- `src/lib/auth-client.ts`
- `src/routes/_app.tsx`
- `src/routes/_app/dashboard.tsx`
- `src/routes/_app/goals.tsx`
- `src/routes/_app/scheduler.tsx`

**Tasks:**

#### 1.1.1 Fix `crossDomainClient` Type Error
```bash
# In packages/convex directory, pin better-auth version:
bun add better-auth@1.4.9 --save-exact
```

The type mismatch is caused by version incompatibility. After pinning, regenerate types:
```bash
bunx convex codegen
```

#### 1.1.2 Fix Convex API Import Path
All web route files use the wrong import path.

**Current (wrong):**
```typescript
import { api } from "@flow-day/convex/convex/_generated/api"
```

**Correct:**
```typescript
import { api } from "@flow-day/convex"
```

**Files to update:**
- [ ] `src/routes/_app/dashboard.tsx`
- [ ] `src/routes/_app/goals.tsx`
- [ ] `src/routes/_app/scheduler.tsx`
- [ ] `src/routes/_app/agent.tsx`

#### 1.1.3 Fix Unused Import Warning
**File:** `src/routes/_app.tsx`
```typescript
// Remove 'redirect' from import:
import { createFileRoute, Outlet, Link, useNavigate } from "@tanstack/react-router"
```

#### 1.1.4 Add Explicit Types for Implicit `any` Parameters

**File:** `src/routes/_app/dashboard.tsx`
```typescript
// Line 19 - Add type for 'b' parameter
.sort((a: Block, b: Block) => { ... })

// Lines 72, 75, 78, 110 - Similar fixes
```

**File:** `src/routes/_app/goals.tsx`
```typescript
// Line 227 - Add type for 'goal' parameter
{activeGoals.map((goal: GoalWithProgress) => ( ... ))}
```

**File:** `src/routes/_app/scheduler.tsx`
```typescript
// Line 118 - Add type for 'block' parameter
{schedule.blocks.slice(0, 5).map((block: ScheduleBlock) => ( ... ))}
```

---

### 1.2 Add Server-Side CORS Configuration

**File:** `packages/convex/convex/http.ts`

**Current:**
```typescript
import { httpRouter } from "convex/server";
import { authComponent, createAuth } from "./auth";

const http = httpRouter();
authComponent.registerRoutes(http, createAuth);

export default http;
```

**Updated:**
```typescript
import { httpRouter } from "convex/server";
import { authComponent, createAuth } from "./auth";

const http = httpRouter();

// CORS handling is REQUIRED for client-side frameworks (React SPA, Vite)
authComponent.registerRoutes(http, createAuth, { cors: true });

export default http;
```

---

### 1.3 Add `crossDomain` Plugin to Server Auth

**File:** `packages/convex/convex/auth.ts`

Add the `crossDomain` plugin which is required for web SPAs:

```typescript
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { expo } from "@better-auth/expo";

const siteUrl = process.env.SITE_URL!;

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth({
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    plugins: [
      crossDomain({ siteUrl }),  // ADD THIS - Required for web SPAs
      expo(),
      convex({ authConfig }),
    ],
    trustedOrigins: [
      "flowday://",
      siteUrl,
      // Add production URL when deployed
      // "https://your-app.vercel.app",
    ],
  });
};
```

**Environment Setup:**
```bash
# Set in Convex dashboard or via CLI:
npx convex env set SITE_URL http://localhost:3000
npx convex env set SITE_URL https://your-production-url.com  # For production
```

---

### 1.4 Fix Rules of Hooks Violation in Scheduler

**File:** `src/routes/_app/scheduler.tsx`

The current code violates React's Rules of Hooks by calling `useQuery` inside a `.map()`:

**Current (wrong):**
```typescript
const schedules = weekDays.map(day => {
  const dateStr = format(day, "yyyy-MM-dd")
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useQuery(api.schedules.getScheduleByDate, { date: dateStr })
})
```

**Solution A: Create a separate component for each day:**
```typescript
function DaySchedule({ date, isToday, isPast }: { date: Date; isToday: boolean; isPast: boolean }) {
  const dateStr = format(date, "yyyy-MM-dd")
  const schedule = useQuery(api.schedules.getScheduleByDate, { date: dateStr })

  return (
    <Card className={isToday ? "border-primary" : isPast ? "opacity-60" : ""}>
      {/* Card content */}
    </Card>
  )
}

// In SchedulerPage:
{weekDays.map((day) => {
  const dateStr = format(day, "yyyy-MM-dd")
  const isToday = dateStr === today
  const isPast = day < new Date() && !isToday
  return <DaySchedule key={dateStr} date={day} isToday={isToday} isPast={isPast} />
})}
```

**Solution B: Create a Convex query that fetches entire week:**
```typescript
// In packages/convex/convex/schedules.ts
export const getWeekSchedule = query({
  args: { weekStartDate: v.string() },
  handler: async (ctx, { weekStartDate }) => {
    // Fetch all 7 days in one query
  }
})
```

---

## 2. Configuration Fixes (P1)

### 2.1 Update trustedOrigins for All Environments

**File:** `packages/convex/convex/auth.ts`

```typescript
const isDevelopment = process.env.NODE_ENV !== "production";
const siteUrl = process.env.SITE_URL!;

trustedOrigins: [
  // Mobile
  "flowday://",

  // Web - Production
  siteUrl,

  // Web - Development
  ...(isDevelopment ? [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
  ] : []),

  // Vercel Preview URLs (wildcard)
  "https://*.vercel.app",

  // Expo Development
  ...(isDevelopment ? [
    "exp://192.168.*.*:*",
    "exp://localhost:*",
  ] : []),
],
```

### 2.2 Add Environment Variable Validation

**File:** `src/lib/convex.ts`

```typescript
const convexUrl = import.meta.env.VITE_CONVEX_URL;
const siteUrl = import.meta.env.VITE_CONVEX_SITE_URL;

if (!convexUrl) {
  throw new Error(
    "VITE_CONVEX_URL is not set. " +
    "Copy .env.example to .env.local and fill in the values."
  );
}

if (!siteUrl) {
  throw new Error(
    "VITE_CONVEX_SITE_URL is not set. " +
    "Copy .env.example to .env.local and fill in the values."
  );
}
```

### 2.3 Enhance Vercel Configuration

**File:** `apps/web/vercel.json`

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

---

## 3. Authentication Improvements (P2)

### 3.1 Implement Proper Route Guards with TanStack Router

**File:** `src/routes/__root.tsx`

```typescript
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router"

interface AuthState {
  isAuthenticated: boolean
  user: { id: string; name: string; email: string } | null
  isPending: boolean
}

interface RouterContext {
  auth: AuthState
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
})

function RootComponent() {
  return (
    <>
      <Outlet />
      {/* DevTools if in development */}
    </>
  )
}
```

**File:** `src/router.tsx` (new file)

```typescript
import { createRouter } from "@tanstack/react-router"
import { routeTree } from "./routeTree.gen"

export const router = createRouter({
  routeTree,
  context: {
    auth: undefined!,
  },
  defaultPendingMs: 1000,
  defaultPendingComponent: () => (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  ),
})

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
```

**File:** `src/routes/_app.tsx` (updated)

```typescript
import { createFileRoute, redirect, Outlet, Link } from "@tanstack/react-router"

export const Route = createFileRoute("/_app")({
  beforeLoad: ({ context, location }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({
        to: "/sign-in",
        search: {
          redirect: location.href,
        },
      })
    }
  },
  component: AppLayout,
})
```

### 3.2 Add Redirect After Login

**File:** `src/routes/sign-in.tsx`

```typescript
export const Route = createFileRoute("/sign-in")({
  validateSearch: (search) => ({
    redirect: (search.redirect as string) || "/dashboard",
  }),
  beforeLoad: ({ context, search }) => {
    if (context.auth.isAuthenticated) {
      throw redirect({ to: search.redirect })
    }
  },
  component: SignInPage,
})

function SignInPage() {
  const { redirect: redirectUrl } = Route.useSearch()
  const navigate = useNavigate()

  const handleSignIn = async (email: string, password: string) => {
    await authClient.signIn.email({ email, password })
    navigate({ to: redirectUrl })
  }

  // ... rest of component
}
```

### 3.3 Add Password Reset Flow

**Create:** `src/routes/forgot-password.tsx`

```typescript
import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError("")

    try {
      await authClient.forgetPassword({ email })
      setIsSubmitted(true)
    } catch (err) {
      setError("Failed to send reset email. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <Card className="mx-auto max-w-md mt-20">
        <CardHeader>
          <CardTitle>Check Your Email</CardTitle>
        </CardHeader>
        <CardContent>
          <p>If an account exists for {email}, you'll receive a password reset link.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mx-auto max-w-md mt-20">
      <CardHeader>
        <CardTitle>Reset Password</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-destructive text-sm">{error}</p>}
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Sending..." : "Send Reset Link"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
```

**Create:** `src/routes/reset-password.tsx`

```typescript
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import { authClient } from "@/lib/auth-client"

export const Route = createFileRoute("/reset-password")({
  validateSearch: (search) => ({
    token: search.token as string,
  }),
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const { token } = Route.useSearch()
  const navigate = useNavigate()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setIsSubmitting(true)
    setError("")

    try {
      await authClient.resetPassword({ token, newPassword: password })
      navigate({ to: "/sign-in" })
    } catch (err) {
      setError("Failed to reset password. The link may have expired.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // ... render form
}
```

### 3.4 Add Sign In Page Link to Forgot Password

**File:** `src/routes/sign-in.tsx`

Add after the sign-in form:
```tsx
<Link to="/forgot-password" className="text-sm text-muted-foreground hover:underline">
  Forgot password?
</Link>
```

---

## 4. Missing Features (P3)

### 4.1 Onboarding Flow

The mobile app has a 5-step onboarding flow. We need to implement this for web.

**Create:** `src/routes/onboarding.tsx`

**Steps:**
1. Welcome screen
2. Wake time selection
3. Sleep time selection
4. Peak energy window selection
5. Notification preferences
6. Location setup (optional)

**Component structure:**
```
src/components/onboarding/
  TimePickerStep.tsx      # Reusable time picker
  EnergyStep.tsx          # Morning/Afternoon/Evening selection
  NotificationStep.tsx    # Minimal vs Proactive
  LocationStep.tsx        # Home/Work addresses
  StepIndicator.tsx       # Progress dots
```

**Time picker options (from mobile):**
```typescript
export const WAKE_TIME_OPTIONS = [
  "05:00", "05:30", "06:00", "06:30", "07:00", "07:30",
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00",
]

export const SLEEP_TIME_OPTIONS = [
  "20:00", "20:30", "21:00", "21:30", "22:00", "22:30",
  "23:00", "23:30", "00:00", "00:30", "01:00", "01:30", "02:00",
]
```

**Routing logic:**
- New users (no `onboardingCompleted` flag) are redirected to `/onboarding`
- After completing onboarding, redirect to `/dashboard`
- Add check in `_app.tsx` beforeLoad

---

### 4.2 Goal Detail Page

**Create:** `src/routes/_app/goals/$goalId.tsx`

**Features needed:**
- [ ] Progress ring visualization
- [ ] Weekly progress stats (hours completed vs target)
- [ ] All-time stats (total hours, total sessions)
- [ ] Preferences display (session length, preferred time, energy level)
- [ ] Recent sessions list
- [ ] Edit goal modal
- [ ] Archive/reactivate button
- [ ] Delete goal with confirmation
- [ ] "Schedule Session" button that links to agent

**Data from mobile's goal detail:**
```typescript
interface GoalDetail {
  // Basic info
  _id: Id<"goals">
  title: string
  description?: string
  category: "learning" | "health" | "career" | "personal" | "creative"

  // Weekly progress
  weeklyProgress: {
    completedMinutes: number
    sessionsCompleted: number
  }
  weeklyTargetMinutes: number

  // All-time stats
  totalMinutes: number
  totalSessions: number

  // Preferences
  preferredSessionLength: { min: number; max: number }
  preferredTime: "morning" | "afternoon" | "evening" | "any"
  energyLevel: "high" | "medium" | "low"
  priority: number

  // Recent sessions
  recentSessions: Array<{
    _id: string
    date: string
    title: string
    startTime: string
    endTime: string
    duration: number
  }>

  isActive: boolean
}
```

---

### 4.3 AI Agent Integration (ElevenLabs)

The mobile app uses ElevenLabs Conversational AI. For web, we need to integrate the `@elevenlabs/react` SDK.

**Install:**
```bash
bun add @elevenlabs/react
```

**Create:** `src/hooks/useElevenLabs.ts`

```typescript
import { useConversation } from "@elevenlabs/react"
import { useConvex, useQuery, useConvexAuth } from "convex/react"
import { api } from "@flow-day/convex"
import { useState, useCallback, useRef, useEffect } from "react"
import { useAgentStore } from "@flow-day/shared/stores"

export interface Message {
  id: string
  text: string
  source: "user" | "assistant" | "system"
  timestamp: number
}

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error"

export function useElevenLabs() {
  const messages = useAgentStore((s) => s.messages)
  const addMessage = useAgentStore((s) => s.addMessage)
  const clearMessages = useAgentStore((s) => s.clearMessages)

  const [status, setStatus] = useState<ConnectionStatus>("disconnected")
  const [error, setError] = useState<string | null>(null)
  const messageIdRef = useRef(0)

  const convex = useConvex()
  const { isAuthenticated } = useConvexAuth()

  // Get agent context for dynamic variables
  const getLocalDate = () => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
  }

  const agentContext = useQuery(
    api.agent.getAgentContext,
    isAuthenticated ? { clientDate: getLocalDate() } : "skip"
  )

  const conversation = useConversation({
    onConnect: () => {
      setStatus("connected")
      setError(null)
    },
    onDisconnect: () => {
      setStatus("disconnected")
    },
    onMessage: (message) => {
      addMessage({
        id: `msg_${++messageIdRef.current}`,
        text: message.message,
        source: message.source === "ai" ? "assistant" : "user",
        timestamp: Date.now(),
      })
    },
    onError: (error) => {
      setError(error || "Connection error")
      setStatus("error")
    },
    // Client tools - same as mobile
    clientTools: {
      getScheduleForDate: async (params) => {
        const blocks = await convex.query(api.blocks.getByDate, { date: params.date })
        return JSON.stringify({ date: params.date, blocks, count: blocks?.length ?? 0 })
      },
      addTaskToSchedule: async (params) => {
        const blockId = await convex.mutation(api.blocks.create, {
          date: params.date,
          startTime: params.startTime,
          endTime: params.endTime,
          title: params.title,
          source: "ai_suggestion",
        })
        return JSON.stringify({ success: true, blockId })
      },
      // Add other tools from mobile...
    },
  })

  const startConversation = useCallback(async () => {
    if (status === "connecting" || status === "connected") return

    setStatus("connecting")
    setError(null)

    try {
      // Get signed URL from Convex action
      const signedUrl = await convex.action(api.agent.getSignedUrl, {})

      // Start session with text-only mode
      await conversation.startSession({
        signedUrl,
        connectionType: "websocket",
        overrides: {
          conversation: {
            textOnly: true, // No microphone needed for web text chat
          },
        },
        dynamicVariables: agentContext ?? undefined,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start conversation")
      setStatus("error")
    }
  }, [status, convex, conversation, agentContext])

  const endConversation = useCallback(async () => {
    await conversation.endSession()
    setStatus("disconnected")
  }, [conversation])

  const sendMessage = useCallback((text: string) => {
    if (status !== "connected" || !text.trim()) return

    addMessage({
      id: `msg_${++messageIdRef.current}`,
      text: text.trim(),
      source: "user",
      timestamp: Date.now(),
    })

    conversation.sendMessage(text.trim())
  }, [status, addMessage, conversation])

  return {
    messages,
    error,
    status,
    isConnecting: status === "connecting",
    isConnected: status === "connected",
    startConversation,
    endConversation,
    sendMessage,
    clearMessages,
  }
}
```

**Update:** `src/routes/_app/agent.tsx`

Replace the mock implementation with the real ElevenLabs hook.

---

### 4.4 Settings Page

**File:** `src/routes/_app/settings.tsx`

Implement the settings page with:
- [ ] Profile section (name, email)
- [ ] Preferences section (wake time, sleep time, peak energy)
- [ ] Notification preferences
- [ ] Theme toggle (light/dark)
- [ ] Sign out button
- [ ] Delete account (with confirmation)

---

## 5. Version Updates (P4)

### 5.1 Update TanStack Router

```bash
cd apps/web
bun update @tanstack/react-router @tanstack/router-plugin @tanstack/react-router-devtools
```

**Versions to update:**
| Package | Current | Target |
|---------|---------|--------|
| @tanstack/react-router | 1.132.0 | ^1.145.9 |
| @tanstack/router-plugin | 1.132.0 | ^1.145.9 |
| @tanstack/react-router-devtools | 1.132.0 | ^1.145.9 |

### 5.2 Verify Other Dependencies Are Current

Run audit:
```bash
cd apps/web && bun outdated
```

**Key packages to verify:**
- `convex` - Should match `packages/convex/package.json`
- `better-auth` - Pin to 1.4.9 for stability
- `tailwindcss` - v4.0.6+ is correct
- `react` / `react-dom` - v19.2.0 is correct
- `zod` - v4.3.5 (Zod 4) is correct

---

## 6. Best Practices & Polish (P5)

### 6.1 Add Loading States

**Global loading component:**
```tsx
// src/components/ui/loading-spinner.tsx
export function LoadingSpinner({ size = "default" }: { size?: "sm" | "default" | "lg" }) {
  const sizeClasses = {
    sm: "h-4 w-4",
    default: "h-8 w-8",
    lg: "h-12 w-12",
  }

  return (
    <div className={`animate-spin rounded-full border-4 border-primary border-t-transparent ${sizeClasses[size]}`} />
  )
}
```

### 6.2 Add Error Boundaries

**Create:** `src/components/error-boundary.tsx`

```tsx
import { Component, ErrorInfo, ReactNode } from "react"
import { Button } from "@/components/ui/button"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex h-screen flex-col items-center justify-center gap-4">
          <h2 className="text-xl font-semibold">Something went wrong</h2>
          <p className="text-muted-foreground">{this.state.error?.message}</p>
          <Button onClick={() => window.location.reload()}>
            Reload Page
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
```

### 6.3 Improve Mobile Responsiveness

Ensure all pages work well on mobile viewports:
- [ ] Dashboard cards stack on mobile
- [ ] Navigation collapses to hamburger menu
- [ ] Forms are touch-friendly
- [ ] Modals are full-screen on mobile

### 6.4 Add Toast Notifications

Install sonner (already in shadcn setup):
```tsx
// In __root.tsx
import { Toaster } from "@/components/ui/sonner"

function RootComponent() {
  return (
    <>
      <Outlet />
      <Toaster />
    </>
  )
}

// Usage in components:
import { toast } from "sonner"

toast.success("Goal created!")
toast.error("Failed to save changes")
```

### 6.5 Add Keyboard Shortcuts

For power users:
- `Cmd/Ctrl + K` - Open command palette
- `Cmd/Ctrl + N` - New goal
- `Escape` - Close modals
- Arrow keys - Navigate lists

---

## Implementation Order

**Phase 1: Critical Fixes (Day 1)**
- [ ] 1.1 Fix all TypeScript errors
- [ ] 1.2 Add CORS to http.ts
- [ ] 1.3 Add crossDomain plugin to auth.ts
- [ ] 1.4 Fix scheduler hooks violation

**Phase 2: Configuration (Day 1-2)**
- [ ] 2.1 Update trustedOrigins
- [ ] 2.2 Add env validation
- [ ] 2.3 Enhance vercel.json

**Phase 3: Auth Improvements (Day 2-3)**
- [ ] 3.1 Implement proper route guards
- [ ] 3.2 Add redirect after login
- [ ] 3.3 Add password reset flow
- [ ] 3.4 Update sign-in page

**Phase 4: Missing Features (Day 3-7)**
- [ ] 4.1 Onboarding flow
- [ ] 4.2 Goal detail page
- [ ] 4.3 ElevenLabs integration
- [ ] 4.4 Settings page

**Phase 5: Updates & Polish (Day 7-8)**
- [ ] 5.1 Update TanStack Router
- [ ] 5.2 Verify dependencies
- [ ] 6.1-6.5 Polish items

---

## Testing Checklist

Before deployment, verify:

- [ ] `bun run build` completes without errors
- [ ] `bunx tsc --noEmit` passes
- [ ] All routes load correctly
- [ ] Authentication flow works (sign up, sign in, sign out)
- [ ] Protected routes redirect to sign-in
- [ ] Convex queries return data
- [ ] Mutations work (create goal, create block)
- [ ] AI agent connects and responds
- [ ] Dark mode works
- [ ] Mobile viewport looks correct
- [ ] Vercel preview deployment works

---

## Environment Variables Reference

**Local (`.env.local`):**
```bash
VITE_CONVEX_URL=https://adjective-animal-123.convex.cloud
VITE_CONVEX_SITE_URL=https://adjective-animal-123.convex.site
```

**Convex Dashboard:**
```bash
npx convex env set SITE_URL http://localhost:3000        # Development
npx convex env set SITE_URL https://your-app.vercel.app  # Production
npx convex env set BETTER_AUTH_SECRET=$(openssl rand -base64 32)
npx convex env set ELEVENLABS_API_KEY=sk_xxx            # For AI agent
npx convex env set ELEVENLABS_AGENT_ID=xxx              # For AI agent
```

**Vercel:**
- `VITE_CONVEX_URL` - Same as .env.local
- `VITE_CONVEX_SITE_URL` - Same as .env.local

---

*Last updated: 2025-01-07*
