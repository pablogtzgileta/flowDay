# Android Testing Checklist

## Overview

This checklist covers manual testing requirements for FlowDay on Android devices. Complete all items before each release.

## Target Devices

| Device | Manufacturer | Android Version | Priority |
|--------|--------------|-----------------|----------|
| Pixel 7 | Google | Android 14 | Primary |
| Pixel 6a | Google | Android 13 | Primary |
| Samsung S23 | Samsung (One UI) | Android 14 | Primary |
| Samsung A54 | Samsung (One UI) | Android 13 | Secondary |
| OnePlus 11 | OnePlus (OxygenOS) | Android 13 | Secondary |

## 1. Keyboard Handling

### KeyboardAvoidingView (agent.tsx)

- [ ] **Text input visible when keyboard appears** - Input field should not be obscured
- [ ] **Behavior: "height" on Android** - Verify height-based keyboard avoidance
- [ ] **Keyboard offset correct** - Content scrolls appropriately
- [ ] **Return key triggers send** - Works with GBoard and other keyboards
- [ ] **Multiline input expands** - TextInput grows within maxHeight (100)

### Different Keyboards

- [ ] **GBoard** - Default Google keyboard works correctly
- [ ] **Samsung Keyboard** - One UI keyboard layout handled
- [ ] **SwiftKey** - Microsoft keyboard works correctly
- [ ] **Gboard voice typing** - Dictation mode functional

### Edge Cases

- [ ] **Split screen mode** - Keyboard doesn't cause layout issues
- [ ] **Floating window** - Content remains accessible
- [ ] **Landscape mode** - Keyboard height handled
- [ ] **Emoji picker** - Additional keyboard UI handled

## 2. Edge-to-Edge Display

### Status Bar

- [ ] **Content not under status bar** - Headers have proper padding
- [ ] **Status bar icons visible** - Proper contrast with app content
- [ ] **Light/dark status bar** - Adapts to theme

### Navigation Bar

- [ ] **Gesture navigation** - Content above gesture bar
- [ ] **Button navigation** - Proper padding above nav buttons
- [ ] **Navigation bar color** - Matches app theme

### Notch/Punch-hole Configurations

- [ ] **Centered punch-hole** - Content flows around cutout
- [ ] **Corner punch-hole** - No UI obscured
- [ ] **Notch devices** - Content in safe area

### Display Modes

- [ ] **Standard navigation** - 3-button layout works
- [ ] **Gesture navigation** - Swipe areas don't conflict
- [ ] **One-handed mode** - UI remains accessible

## 3. TalkBack Accessibility

### Timeline Tab (index.tsx)

- [ ] **Date tabs announced** - "Today" and "Tomorrow" buttons accessible
- [ ] **Date header readable** - Formatted date announced
- [ ] **TimeBlock accessible** - contentDescription includes title
- [ ] **TimeBlock hint present** - Action hint announced
- [ ] **Swipe actions accessible** - Complete/Skip buttons have labels
- [ ] **Empty state readable** - EmptyState component announces content
- [ ] **Navigation logical** - Focus order follows visual layout

### Goals Tab

- [ ] **GoalCard accessible** - Progress announced with contentDescription
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

- [ ] **Menu items accessible** - All buttons have contentDescription
- [ ] **Section headers announced** - Category titles read
- [ ] **Toggle states announced** - Switch on/off state
- [ ] **Navigation between sections** - Back button accessible
- [ ] **Modal dismiss accessible** - Close button works

### Review Components

- [ ] **StatCard values announced** - Label, value, trend read
- [ ] **Charts accessible** - Meaningful descriptions provided
- [ ] **InsightCard readable** - Full content announced

## 4. Notification Channels

### Channel Setup (notifications.ts)

- [ ] **"default" channel created** - FlowDay Reminders
  - Name: "FlowDay Reminders"
  - Importance: HIGH
  - Vibration: [0, 250, 250, 250]
  - Light: #3B82F6 (blue)

- [ ] **"travel" channel created** - Travel Reminders
  - Name: "Travel Reminders"
  - Importance: MAX
  - Vibration: [0, 500, 250, 500]
  - Light: #EAB308 (yellow)

### Channel Management

- [ ] **User can modify channels** - System Settings accessible
- [ ] **Channel deletion handled** - App recreates if deleted
- [ ] **Importance respected** - Notifications appear correctly
- [ ] **Sound settings work** - Custom sounds play

### POST_NOTIFICATIONS Permission (Android 13+)

- [ ] **Permission requested** - System dialog shown
- [ ] **Denial handled gracefully** - App continues to function
- [ ] **Settings redirect works** - User can enable later
- [ ] **Permission state detected** - App knows current status

## 5. Audio Focus Handling

### Audio Focus Types

- [ ] **AUDIOFOCUS_GAIN** - Voice agent acquires focus
- [ ] **AUDIOFOCUS_LOSS** - Permanent loss, stop audio
- [ ] **AUDIOFOCUS_LOSS_TRANSIENT** - Temporary loss, pause
- [ ] **AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK** - Lower volume

### Scenarios

- [ ] **Incoming call** - Audio pauses, resumes after
- [ ] **Google Assistant** - Voice session interrupted
- [ ] **Music app** - Audio focus negotiation works
- [ ] **Navigation app** - Turn-by-turn interrupts correctly
- [ ] **Video call apps** - Focus released properly

### Bluetooth Audio

- [ ] **Bluetooth headphones** - Audio routes correctly
- [ ] **Bluetooth speaker** - Audio plays through speaker
- [ ] **Bluetooth disconnect** - Falls back to phone speaker
- [ ] **Multiple Bluetooth devices** - Correct device selected

### Error Recovery

- [ ] **Resume after interruption** - Within 2 seconds
- [ ] **Retry with exponential backoff** - On focus request failure
- [ ] **Clear error messages** - User understands issue
- [ ] **Restart voice session** - Option always available

## 6. Battery Optimization

### Doze Mode Behavior

- [ ] **Notifications delivered** - Alarms fire in Doze
- [ ] **App wakes correctly** - When user opens
- [ ] **Background tasks complete** - Sync happens eventually

### Battery Optimization Detection

- [ ] **Optimization status detected** - App knows if restricted
- [ ] **User prompt shown** - When optimization affects features
- [ ] **Settings link works** - User can disable optimization
- [ ] **App functional when optimized** - Core features work

### App Standby Buckets

- [ ] **Active bucket** - Full functionality
- [ ] **Working set** - Minor delays acceptable
- [ ] **Frequent** - Some feature delays
- [ ] **Rare** - Inform user of limitations

## 7. Notification Functionality

### Scheduling

- [ ] **Notifications scheduled** - Block reminders created
- [ ] **Correct timing** - Appear at calculated times
- [ ] **Categories applied** - Correct channel used
- [ ] **Actions work** - Start, Snooze, Skip buttons

### Exact Alarms

- [ ] **Exact alarm permission** - Requested on Android 12+
- [ ] **Fallback to inexact** - If permission denied
- [ ] **Timing acceptable** - Within few minutes of target

## 8. Deep Linking

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

## 9. Visual Parity

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

`apps/mobile/__snapshots__/android/`

**Note**: Screenshot capture using Maestro will be implemented in Phase 4.

## 10. Performance

- [ ] **Smooth scrolling** - Timeline FlashList 60fps
- [ ] **Quick tab switches** - <100ms navigation
- [ ] **Responsive interactions** - Haptic feedback immediate
- [ ] **No ANR dialogs** - No "App Not Responding" issues
- [ ] **Memory usage stable** - Extended usage doesn't leak

## 11. Edge Cases

- [ ] **Battery saver mode** - App functions normally
- [ ] **No network** - Offline mode graceful
- [ ] **Limited storage** - No crashes
- [ ] **Background/foreground** - State preserved
- [ ] **Process death** - State restored from storage
- [ ] **Screen rotation** - State preserved (if supported)
- [ ] **Multi-window** - App usable in split screen

---

## Test Execution Log

| Date | Tester | Device | Android Version | Pass/Fail | Notes |
|------|--------|--------|-----------------|-----------|-------|
| | | | | | |
| | | | | | |

## Known Issues

*Document any discovered issues here with links to bug reports*

---

Last updated: 2026-01-01
