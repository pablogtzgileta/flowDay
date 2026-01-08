# iOS Testing Checklist

## Overview

This checklist covers manual testing requirements for FlowDay on iOS devices. Complete all items before each release.

## Target Devices

| Device | Screen Size | iOS Version | Priority |
|--------|-------------|-------------|----------|
| iPhone 15 Pro | 6.7" | iOS 18 | Primary |
| iPhone 15 | 6.1" | iOS 18 | Primary |
| iPhone SE (3rd gen) | 4.7" | iOS 17 | Secondary |
| iPhone 13 mini | 5.4" | iOS 17 | Secondary |
| iPad Pro 11" | 11" | iOS 17 | Optional |

## 1. Keyboard Handling

### KeyboardAvoidingView (agent.tsx)

- [ ] **Text input visible when keyboard appears** - Input field should not be obscured
- [ ] **Keyboard offset correct** - Content scrolls appropriately (offset: 90)
- [ ] **Behavior: "padding" on iOS** - Verify padding-based keyboard avoidance
- [ ] **Return key triggers send** - `returnKeyType="send"` works correctly
- [ ] **Multiline input expands** - TextInput grows within maxHeight (100)

### Edge Cases

- [ ] **Hardware keyboard** - UI handles external keyboard correctly
- [ ] **Floating keyboard (iPad)** - Content remains accessible
- [ ] **Split keyboard (iPad)** - No layout issues
- [ ] **Quick type bar** - Predictions don't obscure content
- [ ] **Voice input** - Dictation mode works correctly

## 2. Safe Area Handling

### Dynamic Island / Notch Devices (iPhone 15, 14 Pro, etc.)

- [ ] **Content not obscured by notch** - Headers visible
- [ ] **Status bar content readable** - Time, battery visible
- [ ] **Modal presentation** - SafeAreaView in SettingsModal works

### Home Button Devices (iPhone SE)

- [ ] **Content not cut off at top** - No clipping under status bar
- [ ] **Bottom content accessible** - No issues without home indicator

### Home Indicator Devices

- [ ] **Bottom content above indicator** - Tab bar has adequate padding
- [ ] **Swipe gestures don't conflict** - Bottom swipe doesn't trigger navigation

## 3. VoiceOver Accessibility

### Timeline Tab (index.tsx)

- [ ] **Date tabs announced** - "Today" and "Tomorrow" buttons accessible
- [ ] **Date header readable** - Formatted date announced
- [ ] **TimeBlock accessible** - accessibilityLabel includes title
- [ ] **TimeBlock hint present** - "Double tap to view details" announced
- [ ] **Swipe actions accessible** - Complete/Skip buttons have labels
- [ ] **Empty state readable** - EmptyState component announces content
- [ ] **Navigation logical** - Focus order follows visual layout

### Goals Tab

- [ ] **GoalCard accessible** - Progress announced with accessibilityLabel
- [ ] **Progress values read** - "X% complete, Y of Z hours this week"
- [ ] **Delete swipe accessible** - "Delete goal" button announced
- [ ] **Goal form navigable** - All inputs accessible in order

### Agent Tab

- [ ] **Mode toggle accessible** - Text/Voice buttons announced
- [ ] **VoiceButton accessible** - Status and action announced
- [ ] **Message list readable** - Messages announced in order
- [ ] **Send button accessible** - State (enabled/disabled) announced
- [ ] **Connection status announced** - Connecting/connected/error states

### Settings Modal

- [ ] **Menu items accessible** - All buttons have labels
- [ ] **Section headers announced** - "Insights", "Quick Settings", etc.
- [ ] **Toggle states announced** - Lazy mode on/off state
- [ ] **Navigation between sections** - Back button accessible
- [ ] **Modal dismiss accessible** - Done button works

### Review Components

- [ ] **StatCard values announced** - Label, value, trend read
- [ ] **Charts accessible** - Meaningful descriptions provided
- [ ] **InsightCard readable** - Full content announced

## 4. Audio Session Handling

### Voice Agent (useVoiceAgent.ts)

- [ ] **Microphone permission requested** - Alert shown on first use
- [ ] **Permission denied handled** - User directed to Settings
- [ ] **Audio mode configured** - `allowsRecordingIOS: true`
- [ ] **Silent mode support** - `playsInSilentModeIOS: true`
- [ ] **Background audio** - `staysActiveInBackground: true`

### Interruption Handling

- [ ] **Incoming call** - Audio pauses, resumes after call
- [ ] **Siri activation** - Voice session gracefully interrupted
- [ ] **Other app audio** - Handle audio focus loss
- [ ] **Control Center** - Play/pause controls respond correctly

### Route Changes

- [ ] **AirPods connect** - Audio routes correctly
- [ ] **AirPods disconnect** - Falls back to speaker
- [ ] **Bluetooth speaker** - Audio routes correctly
- [ ] **Wired headphones** - Audio routes correctly

### Error Recovery

- [ ] **Resume after interruption** - Within 2 seconds
- [ ] **Clear error messages** - User understands what happened
- [ ] **Retry option available** - Can restart voice session

## 5. Notification Permissions

### First-Time Request

- [ ] **Permission prompt shown** - iOS system dialog appears
- [ ] **Graceful denial handling** - App continues to function
- [ ] **Banner shown** - NotificationPermissionBanner visible when needed

### Settings Redirect

- [ ] **Link to Settings works** - User can enable notifications
- [ ] **App detects permission change** - Refreshes on return

### Provisional Notifications (iOS 12+)

- [ ] **Quiet notifications work** - Delivered to Notification Center
- [ ] **Promotion to alerts** - User can enable full notifications

### Graceful Degradation

- [ ] **App functional without permissions** - Core features work
- [ ] **No repeated prompts** - Respect user's choice
- [ ] **Clear indication** - User knows notifications are off

## 6. Notification Functionality

### Scheduling

- [ ] **Notifications scheduled** - Block reminders created
- [ ] **Correct timing** - Appear at calculated times
- [ ] **Categories applied** - TASK_REMINDER, TRAVEL_REMINDER
- [ ] **Actions work** - Start, Snooze, Skip buttons

### Channels (iOS)

- [ ] **Default sound** - Task reminders audible
- [ ] **Custom actions** - Buttons appear and function

## 7. Deep Linking

### URL Scheme: flowday://

- [ ] **Cold start navigation** - App opens to correct screen
- [ ] **Warm start navigation** - Already running, navigates correctly
- [ ] **Invalid URL handling** - Graceful fallback to home

### Test URLs

- [ ] `flowday://` - Opens app
- [ ] `flowday://timeline` - Opens timeline
- [ ] `flowday://goals` - Opens goals
- [ ] `flowday://agent` - Opens agent
- [ ] `flowday://invalid` - Falls back to default

## 8. Visual Parity

### Screenshots Required (Defer to Phase 4)

- [ ] Timeline (empty state)
- [ ] Timeline (populated with blocks)
- [ ] Goals list
- [ ] Goal detail
- [ ] Agent (text mode)
- [ ] Agent (voice mode)
- [ ] Settings modal
- [ ] Onboarding flow

### Output Location

`apps/mobile/__snapshots__/ios/`

**Note**: Screenshot capture using Maestro will be implemented in Phase 4.

## 9. Performance

- [ ] **Smooth scrolling** - Timeline FlashList 60fps
- [ ] **Quick tab switches** - <100ms navigation
- [ ] **Responsive interactions** - Haptic feedback immediate
- [ ] **No memory warnings** - Extended usage stable

## 10. Edge Cases

- [ ] **Low power mode** - App functions normally
- [ ] **No network** - Offline mode graceful
- [ ] **Limited storage** - No crashes
- [ ] **Background/foreground** - State preserved

---

## Test Execution Log

| Date | Tester | Device | iOS Version | Pass/Fail | Notes |
|------|--------|--------|-------------|-----------|-------|
| | | | | | |
| | | | | | |

## Known Issues

*Document any discovered issues here with links to bug reports*

---

Last updated: 2026-01-01
