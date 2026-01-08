# FlowDay Testing Guide

This guide documents the testing architecture, conventions, and best practices for the FlowDay project.

## Test Runner Architecture

FlowDay uses two different test runners for different parts of the codebase:

### Bun Test (Mobile App)

**Location**: `apps/mobile/`
**Runner**: `bun test`
**Configuration**: Uses `test-setup.ts` for mocks

```bash
# Run all mobile tests
cd apps/mobile && bun test

# Run with watch mode
bun test --watch

# Run specific test file
bun test notifications.test.ts
```

**Why Bun?**
- Built into Bun runtime (no additional dependencies)
- Fast execution (native speed)
- Compatible with React Native mocking patterns
- Integrates well with the monorepo's Bun-first approach

### Vitest (Convex Backend)

**Location**: `packages/convex/`
**Runner**: `vitest`
**Configuration**: `vitest.config.ts`

```bash
# Run all Convex tests
cd packages/convex && bun run vitest

# Run with coverage
bun run vitest --coverage
```

**Why Vitest?**
- Required for `convex-test` library compatibility
- Uses `edge-runtime` environment to simulate Convex's execution context
- Better support for testing Convex functions with the convex-test helpers

## Test Function Conventions

**Standard: Use `test()` not `it()`**

Both `test()` and `it()` are available, but we standardize on `test()` for consistency:

```typescript
// Preferred
import { test, expect } from "bun:test";

test("should schedule notification for block", async () => {
  // test code
});

// Also acceptable in describe blocks
import { describe, test, expect } from "bun:test";

describe("notifications", () => {
  test("schedules notification for future time", async () => {
    // test code
  });
});
```

**Avoid:**
```typescript
// Not preferred - don't use it()
it("should do something", () => {
  // ...
});
```

## Coverage Configuration

### Mobile Coverage

```bash
cd apps/mobile && bun test --coverage
```

Current coverage target: 80% line coverage

### Convex Coverage

Configured in `packages/convex/vitest.config.ts`:

```typescript
coverage: {
  provider: "v8",
  thresholds: { lines: 80 }
}
```

## Test File Organization

### Mobile Tests

```
apps/mobile/
  lib/
    __tests__/
      notifications.test.ts
      preferences.test.ts
  components/
    __tests__/
      Timeline.test.tsx
  test-setup.ts          # Global mocks and test utilities
```

### Convex Tests

```
packages/convex/
  convex/
    __tests__/
      blocks.test.ts
      goals.test.ts
    utils/
      __tests__/
        time.test.ts
  vitest.config.ts
```

## Mocking Guidelines

### React Native Mocks (Mobile)

All React Native and Expo mocks are configured in `apps/mobile/test-setup.ts`. Key mocks include:

- `react-native` - View, Text, TouchableOpacity, etc.
- `expo-notifications` - Full notification API mock with test tracking
- `expo-device` - Device info mock
- `expo-constants` - App configuration mock
- `expo-haptics` - Haptic feedback mock

**Using the notification test helpers:**

```typescript
import { test, expect, beforeEach } from "bun:test";

beforeEach(() => {
  // Reset notification tracking before each test
  globalThis.__TEST_NOTIFICATIONS__.reset();
});

test("schedules notification", async () => {
  await scheduleBlockNotification({
    blockId: "123",
    title: "Test",
    body: "Test body",
    triggerAt: new Date(Date.now() + 60000),
    requiresTravel: false,
  });

  expect(globalThis.__TEST_NOTIFICATIONS__.scheduled).toHaveLength(1);
});
```

### Convex Mocks

Use `convex-test` for mocking Convex functions:

```typescript
import { convexTest } from "convex-test";
import { api } from "../_generated/api";
import schema from "../schema";

test("creates a block", async () => {
  const t = convexTest(schema);

  await t.run(async (ctx) => {
    const blockId = await ctx.runMutation(api.blocks.create, {
      title: "Test Block",
      // ... other fields
    });

    expect(blockId).toBeDefined();
  });
});
```

## Running All Tests

From the monorepo root:

```bash
# Run all tests (mobile uses bun:test)
bun test

# Run only mobile tests
cd apps/mobile && bun test

# Run only Convex tests
cd packages/convex && bun run vitest
```

## Debugging Tests

### Mobile Tests

```bash
# Run single test with verbose output
bun test --only "test name pattern"

# Run with debug logging
DEBUG=* bun test
```

### Convex Tests

```bash
# Run single test
bun run vitest -t "test name"

# Run in watch mode with UI
bun run vitest --ui
```

## Best Practices

1. **Isolate tests**: Reset global state in `beforeEach` hooks
2. **Test behavior, not implementation**: Focus on what the code does, not how
3. **Use descriptive test names**: `test("schedules notification 5 minutes before block start")`
4. **Keep tests fast**: Mock external dependencies, avoid real network calls
5. **Group related tests**: Use `describe()` blocks for logical grouping
6. **Test edge cases**: Null inputs, empty arrays, boundary conditions
