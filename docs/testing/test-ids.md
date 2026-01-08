# FlowDay Test ID Registry

This document tracks all testID props used in the FlowDay mobile application for E2E testing with Maestro.

## Naming Convention

TestIDs follow the pattern: `{screen}-{element}`

- **screen**: The screen or component context (e.g., `signin`, `timeline`, `goals`, `onboarding`)
- **element**: The specific element type and purpose (e.g., `email-input`, `submit-button`, `list`)

### Examples
- `signin-email-input` - Email input field on sign-in screen
- `timeline-list` - The main timeline list component
- `goals-add-button` - FAB button to add a new goal

## TestID Registry

### Authentication (3 testIDs)

| TestID | Component | File | Purpose |
|--------|-----------|------|---------|
| `signin-email-input` | TextInput | `app/(auth)/sign-in.tsx` | Email input field |
| `signin-password-input` | TextInput | `app/(auth)/sign-in.tsx` | Password input field |
| `signin-submit-button` | Pressable | `app/(auth)/sign-in.tsx` | Sign in button |

### Onboarding (2 testIDs)

| TestID | Component | File | Purpose |
|--------|-----------|------|---------|
| `onboarding-get-started` | Pressable | `app/(onboarding)/index.tsx` | Initial "Get Started" button |
| `onboarding-continue` | Pressable | `app/(onboarding)/index.tsx` | Continue/Next button during steps |

### Timeline (3 testIDs)

| TestID | Component | File | Purpose |
|--------|-----------|------|---------|
| `timeline-list` | FlashList | `app/(tabs)/index.tsx` | Main timeline list container |
| `timeline-today-tab` | Pressable | `app/(tabs)/index.tsx` | Today tab selector |
| `timeline-tomorrow-tab` | Pressable | `app/(tabs)/index.tsx` | Tomorrow tab selector |

### TimeBlock Actions (2 testIDs)

| TestID | Component | File | Purpose |
|--------|-----------|------|---------|
| `timeblock-complete-action` | Pressable | `components/timeline/TimeBlock.tsx` | Swipe-to-complete action |
| `timeblock-skip-action` | Pressable | `components/timeline/TimeBlock.tsx` | Swipe-to-skip action |

### Goals (4 testIDs)

| TestID | Component | File | Purpose |
|--------|-----------|------|---------|
| `goals-list` | FlashList | `app/(tabs)/goals.tsx` | Main goals list container |
| `goals-add-button` | Pressable (FAB) | `app/(tabs)/goals.tsx` | Floating action button to create goal |
| `goals-title-input` | TextInput | `components/goals/GoalForm.tsx` | Goal title input field |
| `goals-save-button` | Pressable | `components/goals/GoalForm.tsx` | Submit/Save goal button |

### Navigation (1 testID - using accessibilityLabels for tabs)

| TestID | Component | File | Purpose |
|--------|-----------|------|---------|
| `nav-settings-button` | Pressable | `app/(tabs)/_layout.tsx` | Settings button in header |

**Note**: Tab navigation uses `tabBarAccessibilityLabel` instead of testID:
- Today tab: `"Today tab - view your timeline"`
- Goals tab: `"Goals tab - manage your goals"`
- Agent tab: `"Agent tab - chat with AI"`

---

## Total TestIDs: 15

This count is within the maximum limit of 15 testIDs specified in the implementation plan.

## Usage in Maestro Flows

TestIDs are used in Maestro flows with the `id` selector:

```yaml
- tapOn:
    id: "signin-email-input"
- inputText: "test@example.com"
```

For accessibility labels (like tabs), use the `text` selector:

```yaml
- tapOn: "Today tab - view your timeline"
```

## Maintenance

When adding new testIDs:

1. Add the testID to the component with `testID="screen-element"` prop
2. Document it in this registry with component, file, and purpose
3. Verify the total count stays at or below 15
4. Update relevant Maestro flows if applicable

## Related Files

- Maestro config: `.maestro/config.yaml`
- E2E flows: `.maestro/flows/`
- EAS build config: `apps/mobile/eas.json`
