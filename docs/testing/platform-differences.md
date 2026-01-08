# Platform Differences Documentation

## Overview

This document catalogs expected visual and behavioral differences between iOS and Android versions of FlowDay. These differences are intentional or platform-inherent and should NOT be flagged as bugs during visual parity testing.

## Acceptable Diff Threshold

**Pixel difference threshold: 5%**

Screenshots with less than 5% pixel difference after accounting for documented platform differences are considered passing.

## Expected Visual Differences

### 1. Status Bar

| Aspect | iOS | Android |
|--------|-----|---------|
| Height | 44-59pt (varies by device) | 24-48dp (varies by device) |
| Notch handling | Dynamic Island / notch | Punch-hole / notch |
| Time format | System setting | System setting |
| Battery icon | Pill shape | Varies by manufacturer |
| Clock position | Center (notch) / Left | Left |

**Action**: Exclude status bar region from pixel comparison.

### 2. Navigation Bar / Home Indicator

| Aspect | iOS | Android |
|--------|-----|---------|
| Style | Home indicator bar | Gesture bar or 3-button nav |
| Height | 34pt (gesture devices) | 48dp (navigation bar) |
| Visibility | Always visible on gesture devices | Can be hidden/shown |
| Color | Adapts to content | Matches navigation bar color |

**Action**: Exclude bottom 50px from pixel comparison.

### 3. Typography

| Aspect | iOS | Android |
|--------|-----|---------|
| System font | San Francisco | Roboto |
| Font weight rendering | Slightly thinner | Slightly bolder |
| Line height | Platform default | Platform default |
| Letter spacing | Tighter | Slightly wider |

**Action**: Accept minor text rendering differences.

### 4. Shadows and Elevation

| Aspect | iOS | Android |
|--------|-----|---------|
| Shadow rendering | Gaussian blur | Material elevation |
| Shadow color | Black with opacity | Black/gray with opacity |
| Shadow spread | Wider, softer | Tighter, defined |
| Default elevation | box-shadow style | elevation prop |

**Action**: Accept shadow rendering differences; verify elements appear elevated.

### 5. Scrolling Behavior

| Aspect | iOS | Android |
|--------|-----|---------|
| Overscroll | Rubber band bounce | Glow effect (edge effect) |
| Scroll indicator | Visible during scroll | Visible during scroll |
| Scroll bar style | Rounded, short | Square, full height |
| Momentum | iOS physics | Android physics |

**Action**: These are behavioral differences, not captured in screenshots.

### 6. Buttons and Pressables

| Aspect | iOS | Android |
|--------|-----|---------|
| Press feedback | Opacity change | Ripple effect |
| Ripple color | N/A | Material ripple |
| Touch target | Min 44x44pt | Min 48x48dp |
| Pressed state | Dims to 0.7 opacity | Ripple overlay |

**Action**: Accept press state differences.

### 7. Modal Presentation

| Aspect | iOS | Android |
|--------|-----|---------|
| Style | Page sheet (slide up) | Full screen or slide up |
| Corner radius | Large (iOS 13+) | Varies |
| Background dimming | Blurred background option | Solid dim |
| Dismiss gesture | Swipe down | Back button / swipe |

**Action**: Accept modal styling differences.

### 8. Activity Indicators

| Aspect | iOS | Android |
|--------|-----|---------|
| Style | Spinning flower | Circular indeterminate |
| Size | Small (20pt), Large (37pt) | Small (20dp), Large (36dp) |
| Color | Gray by default | Primary color |
| Animation | Clockwise rotation | Counter-clockwise |

**Action**: Accept loading indicator styling differences.

### 9. Keyboard

| Aspect | iOS | Android |
|--------|-----|---------|
| Height | ~291pt (varies) | Varies significantly |
| Style | White/dark theme | Matches keyboard app |
| Accessory bar | QuickType suggestions | Varies by keyboard |
| Return key | "Send" blue highlight | Varies |

**Action**: Exclude keyboard from screenshots.

### 10. Safe Area Insets

| Aspect | iOS | Android |
|--------|-----|---------|
| Top | 44-59pt (notch dependent) | Status bar height |
| Bottom | 34pt (home indicator) | Navigation bar height |
| Left/Right | Usually 0 | Usually 0 |
| Landscape | Accounts for notch | Varies |

**Action**: Content positioning will differ; verify content is visible.

## Expected Behavioral Differences

### 1. Haptic Feedback

| Aspect | iOS | Android |
|--------|-----|---------|
| Tap feedback | Taptic Engine | Varies by device |
| Success feedback | Notch-tick pattern | Standard vibration |
| Warning feedback | Double-tick | Standard vibration |
| Availability | All modern iPhones | Device-dependent |

### 2. Notifications

| Aspect | iOS | Android |
|--------|-----|---------|
| Permission model | Request once | Automatic (Android 12-), POST_NOTIFICATIONS (13+) |
| Channels | Categories (less flexible) | Full channel support |
| Actions | Category-based buttons | Inline actions |
| Grouping | Automatic by app | Channel-based |

### 3. Audio Session

| Aspect | iOS | Android |
|--------|-----|---------|
| API | AVAudioSession | AudioManager focus |
| Interruption handling | Delegate callbacks | Focus change listener |
| Silent mode | playsInSilentModeIOS | No equivalent (always plays) |
| Background audio | staysActiveInBackground | Service-based |

### 4. Deep Linking

| Aspect | iOS | Android |
|--------|-----|---------|
| Handling | expo-linking | expo-linking |
| App state on link | Cold/warm start detection | Intent handling |
| URL scheme | flowday:// | flowday:// |

## Screenshot Comparison Guidelines

### Before Capturing

1. Ensure same test data is loaded
2. Set device to same time zone
3. Use system default font sizes
4. Disable "Reduce Motion" / "Remove animations"
5. Use light mode for baseline (or capture both)

### Regions to Mask

When running automated visual comparison:

```
mask_regions:
  - name: status_bar
    ios: { top: 0, height: 60 }
    android: { top: 0, height: 48 }
  - name: navigation_bar
    ios: { bottom: 0, height: 40 }
    android: { bottom: 0, height: 50 }
  - name: time_display
    description: System time varies
  - name: network_indicators
    description: Signal strength varies
```

### Comparison Algorithm Settings

```yaml
comparison:
  algorithm: "pixelmatch"
  threshold: 0.1  # Pixel sensitivity (0-1)
  includeAA: false  # Ignore anti-aliasing differences
  diffMask: true  # Generate diff mask
  failThreshold: 0.05  # 5% difference = fail
```

## Platform-Specific Bugs vs. Expected Differences

### How to Classify

| Classification | Description | Action |
|----------------|-------------|--------|
| Expected Difference | Listed in this document | Accept |
| Platform Bug | Incorrect behavior on one platform | File bug |
| Cross-Platform Bug | Wrong on both platforms | File bug |
| Design Deviation | Intentional platform-specific design | Document |

### Filing Platform-Specific Bugs

When filing a bug:

1. Specify affected platform(s)
2. Include device model and OS version
3. Note if it's a regression
4. Attach screenshots from both platforms
5. Reference this document if NOT expected

## Approval Process for Baseline Updates

**Two-approver requirement**: Any changes to this document or new baseline screenshots require approval from:

1. A developer who implemented the feature
2. A QA/product team member

This prevents accidental acceptance of regressions as "expected differences."

---

## Quick Reference: What to Ignore

1. Status bar content and styling
2. Navigation bar / home indicator styling
3. Font rendering differences (same text, different rendering)
4. Shadow/elevation rendering
5. Activity indicator styling
6. Press/tap feedback animations
7. Scroll overscroll effects
8. Modal corner radius
9. Keyboard appearance

## Quick Reference: What to Flag

1. Missing UI elements
2. Incorrect text content
3. Wrong colors (beyond platform rendering)
4. Broken layouts
5. Cut-off content
6. Inaccessible UI
7. Non-functional buttons
8. Incorrect navigation

---

Last updated: 2026-01-01
