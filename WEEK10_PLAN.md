# Week 10: Energy-Based Scheduling - Implementation Plan

## Overview
Implement a granular hourly energy curve system that allows users to define their energy levels throughout the day, with intelligent scheduling that matches task energy requirements to optimal time slots.

---

## Phase 1: Schema & Backend Foundation

### 1.1 Update User Schema
**File:** `packages/convex/convex/schema.ts`

Add to `users.preferences`:
```typescript
energyProfile: v.optional(v.object({
  // Hourly energy levels (0-23 hours mapped to energy level)
  // Stored as array of 24 values: "high" | "medium" | "low"
  hourlyLevels: v.array(v.union(
    v.literal("high"),
    v.literal("medium"),
    v.literal("low")
  )),
  // Quick presets for common patterns
  preset: v.optional(v.union(
    v.literal("morning_person"),
    v.literal("night_owl"),
    v.literal("steady"),
    v.literal("custom")
  )),
})),
lazyModeEnabled: v.optional(v.boolean()),
lazyModeUntil: v.optional(v.number()), // Timestamp - auto-disable after this time
```

### 1.2 Update User Mutations
**File:** `packages/convex/convex/users.ts`

- Add `updateEnergyProfile` mutation
- Add `toggleLazyMode` mutation (with optional duration)
- Update `updatePreferences` to handle new fields

---

## Phase 2: Scheduling Utilities

### 2.1 Create Scheduling Module
**File:** `packages/convex/convex/scheduling.ts` (NEW)

```typescript
// Energy level for a specific hour based on user's profile
export function getEnergyLevelForHour(
  hour: number,
  energyProfile: EnergyProfile | undefined,
  peakEnergyWindow: "morning" | "afternoon" | "evening"
): "high" | "medium" | "low"

// Get energy level for a time string "HH:MM"
export function getEnergyLevelForTime(
  time: string,
  energyProfile: EnergyProfile | undefined,
  peakEnergyWindow: "morning" | "afternoon" | "evening"
): "high" | "medium" | "low"

// Score a time slot for a task with given energy requirement
export function scoreSlotForEnergy(
  slotStart: string,
  slotEnd: string,
  taskEnergyLevel: "high" | "medium" | "low",
  userEnergyProfile: EnergyProfile | undefined,
  peakEnergyWindow: "morning" | "afternoon" | "evening"
): number

// Find optimal slots for a task
export const findOptimalSlots = query({...})

// Validate energy match and return warnings
export const validateEnergyMatch = query({...})

// Get lazy mode alternatives for high-energy tasks
export const getLazyModeAlternatives = query({...})
```

### 2.2 Default Energy Profiles (Presets)
```typescript
const ENERGY_PRESETS = {
  morning_person: [
    "low", "low", "low", "low", "low", "low",     // 00-05: sleeping
    "medium", "high", "high", "high", "high", "high", // 06-11: peak morning
    "medium", "low", "medium", "medium", "medium", "medium", // 12-17: afternoon dip
    "medium", "low", "low", "low", "low", "low"   // 18-23: evening wind down
  ],
  night_owl: [
    "low", "low", "low", "low", "low", "low",     // 00-05: sleeping
    "low", "low", "medium", "medium", "medium", "medium", // 06-11: slow start
    "medium", "medium", "high", "high", "high", "high", // 12-17: building up
    "high", "high", "high", "medium", "medium", "low"  // 18-23: peak evening
  ],
  steady: [
    "low", "low", "low", "low", "low", "low",     // 00-05: sleeping
    "medium", "medium", "medium", "medium", "medium", "medium", // 06-11
    "medium", "medium", "medium", "medium", "medium", "medium", // 12-17
    "medium", "medium", "low", "low", "low", "low" // 18-23
  ]
}
```

---

## Phase 3: Agent Enhancement

### 3.1 Enhanced Agent Context
**File:** `packages/convex/convex/agent.ts`

Add to `getAgentContext` return:
```typescript
{
  // Existing fields...

  // NEW: Energy schedule as human-readable string
  energy_schedule: "06:00-12:00: high energy, 12:00-14:00: low energy (post-lunch dip), 14:00-18:00: medium energy, 18:00-22:00: low energy",

  // NEW: Current energy level based on time
  current_energy: "high", // or "medium" or "low"

  // NEW: Lazy mode status
  lazy_mode: "enabled until 6pm" | "disabled",

  // NEW: Energy-aware scheduling tips
  energy_tips: "User has high energy now (morning peak). Good time for challenging tasks. Avoid scheduling high-energy tasks after 2pm when energy dips.",
}
```

### 3.2 Agent System Prompt Updates
The ElevenLabs agent should be updated with instructions to:
1. Check `current_energy` before suggesting task times
2. Warn if scheduling high-energy tasks during low-energy periods
3. Respect `lazy_mode` and suggest alternatives
4. Use `energy_schedule` to make informed suggestions

---

## Phase 4: Block Creation Enhancement

### 4.1 Energy Validation in Block Creation
**File:** `packages/convex/convex/blocks.ts`

Update `create` mutation to:
1. Accept optional `checkEnergyMatch` parameter
2. Return `energyWarning` if task energy doesn't match slot energy
3. Include `suggestedAlternatives` array with better time options

```typescript
// Return type enhancement
interface CreateBlockResult {
  blockId: Id<"blocks">;
  energyWarning?: {
    message: string;
    taskEnergy: "high" | "medium" | "low";
    slotEnergy: "high" | "medium" | "low";
    suggestedTimes?: Array<{ startTime: string; endTime: string; energy: string }>;
  };
}
```

---

## Phase 5: Mobile UI

### 5.1 Theme Updates
**File:** `apps/mobile/styles/unistyles.ts`

Add energy-related colors:
```typescript
// Energy level colors
energyHigh: "#22C55E",      // Green - high energy
energyMedium: "#EAB308",    // Yellow - medium energy
energyLow: "#94A3B8",       // Gray - low energy

// Energy zone backgrounds (for timeline)
energyHighBg: "#22C55E15",
energyMediumBg: "#EAB30815",
energyLowBg: "#94A3B815",
```

### 5.2 EnergyProfileEditor Component
**File:** `apps/mobile/components/settings/EnergyProfileEditor.tsx` (NEW)

Features:
- Preset selector (Morning Person, Night Owl, Steady, Custom)
- Visual hourly energy curve editor (24 bars that can be tapped to cycle through levels)
- Preview of the energy pattern
- Reset to preset option

### 5.3 LazyModeToggle Component
**File:** `apps/mobile/components/settings/LazyModeToggle.tsx` (NEW)

Features:
- Toggle switch for lazy mode
- Duration picker (rest of today, until tomorrow, custom time)
- Explanation text of what lazy mode does
- Visual indicator when active

### 5.4 SettingsModal Component
**File:** `apps/mobile/components/settings/SettingsModal.tsx` (NEW)

Sections:
- Energy Profile (links to EnergyProfileEditor)
- Lazy Mode toggle
- Notification preferences (existing)
- Wake/Sleep times (existing)
- Account info

### 5.5 Settings Button in Header
**File:** `apps/mobile/app/(tabs)/_layout.tsx`

Add gear icon to header that opens SettingsModal

### 5.6 Timeline Energy Zones
**File:** `apps/mobile/app/(tabs)/index.tsx`

Add visual energy zone indicators:
- Colored background bands showing energy levels throughout the day
- Subtle but visible distinction between high/medium/low zones
- Legend or tooltip explaining the colors

---

## Implementation Order

1. **Schema & Backend** (Phase 1 + 2)
   - Update schema
   - Create scheduling.ts utilities
   - Update user mutations

2. **Agent Enhancement** (Phase 3)
   - Update getAgentContext
   - Test with ElevenLabs agent

3. **Block Integration** (Phase 4)
   - Add energy validation
   - Test scheduling flow

4. **Mobile UI** (Phase 5)
   - Theme updates
   - Components
   - Integration

---

## Testing Checklist

- [ ] User can select energy preset during onboarding
- [ ] User can customize hourly energy levels in settings
- [ ] Agent context includes accurate energy information
- [ ] Agent warns about energy mismatches when scheduling
- [ ] Lazy mode can be enabled/disabled
- [ ] Lazy mode auto-disables after set duration
- [ ] Timeline shows energy zones
- [ ] Block creation returns energy warnings
- [ ] Scheduling utilities correctly score time slots

---

## Implementation Status: COMPLETE

### Files Created
- `packages/convex/convex/scheduling.ts` - Energy scheduling utilities
- `apps/mobile/components/settings/EnergyProfileEditor.tsx` - Energy profile UI
- `apps/mobile/components/settings/LazyModeToggle.tsx` - Lazy mode toggle UI
- `apps/mobile/components/settings/SettingsModal.tsx` - Settings modal

### Files Modified
- `packages/convex/convex/schema.ts` - Added energyProfile, lazyModeEnabled, lazyModeUntil
- `packages/convex/convex/users.ts` - Added updateEnergyProfile, toggleLazyMode, getEnergyPresets
- `packages/convex/convex/agent.ts` - Enhanced getAgentContext with energy fields
- `packages/convex/convex/blocks.ts` - Added energy validation to create mutation
- `apps/mobile/styles/unistyles.ts` - Added energy-related colors
- `apps/mobile/app/(tabs)/_layout.tsx` - Added settings button and modal
- `apps/mobile/app/(tabs)/index.tsx` - Added energy zone indicator
