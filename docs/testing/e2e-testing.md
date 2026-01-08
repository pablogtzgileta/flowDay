# FlowDay E2E Testing Guide

This document covers end-to-end (E2E) testing with Maestro for the FlowDay mobile application.

## Prerequisites

### Install Maestro

```bash
# macOS (using Homebrew)
brew install maestro

# Verify installation
maestro --version
```

### Install EAS CLI

```bash
# Install EAS CLI globally
npm install -g eas-cli

# Login to your Expo account
eas login
```

### Environment Setup

Create a `.env.e2e` file (not committed to git) with test credentials:

```bash
export TEST_EMAIL="test@example.com"
export TEST_PASSWORD="testpassword123"
```

Load environment before running tests:

```bash
source .env.e2e
```

---

## Build Commands

### iOS Simulator Build

```bash
# Navigate to mobile app directory
cd apps/mobile

# Build for iOS simulator (E2E testing)
eas build --profile e2e-test --platform ios

# Or for development builds (faster, hot reload)
eas build --profile development --platform ios
```

### Android APK Build

```bash
# Navigate to mobile app directory
cd apps/mobile

# Build Android APK for testing
eas build --profile e2e-test --platform android

# Or for development builds
eas build --profile development --platform android
```

### Dry Run (Verify Configuration)

Before running actual builds, verify the configuration:

```bash
# Verify iOS build configuration
eas build --profile e2e-test --platform ios --dry-run

# Verify Android build configuration
eas build --profile e2e-test --platform android --dry-run
```

### Local Builds (Optional)

For faster iteration, you can build locally:

```bash
# iOS (requires Xcode)
npx expo run:ios

# Android (requires Android Studio)
npx expo run:android
```

---

## Running E2E Tests

### Running All Flows

```bash
# From repository root
maestro test .maestro/flows/

# Or run specific flow
maestro test .maestro/flows/onboarding.yaml
maestro test .maestro/flows/timeline.yaml
maestro test .maestro/flows/goals.yaml
```

### Running with Environment Variables

```bash
# Set credentials and run
TEST_EMAIL="test@example.com" TEST_PASSWORD="pass123" maestro test .maestro/flows/
```

### Running on Specific Device

```bash
# List available devices
maestro device list

# Run on specific device
maestro test --device "iPhone 15 Pro" .maestro/flows/
```

### Running in Studio (Visual Mode)

```bash
# Opens Maestro Studio for visual test creation/debugging
maestro studio
```

---

## Stability Verification

### Requirement

**All flows must pass 5 consecutive runs before being declared stable.**

This requirement is specified in the Master Plan to ensure tests are not flaky.

### Running Stability Verification

```bash
#!/bin/bash
# stability-check.sh

FLOW_DIR=".maestro/flows"
REQUIRED_PASSES=5
FLOW_NAME=${1:-"all"}

if [ "$FLOW_NAME" = "all" ]; then
  FLOWS=$(ls $FLOW_DIR/*.yaml)
else
  FLOWS="$FLOW_DIR/$FLOW_NAME.yaml"
fi

for flow in $FLOWS; do
  echo "=== Stability check for: $flow ==="
  passed=0

  for i in $(seq 1 $REQUIRED_PASSES); do
    echo "Run $i of $REQUIRED_PASSES..."
    if maestro test "$flow"; then
      passed=$((passed + 1))
      echo "PASS ($passed/$REQUIRED_PASSES)"
    else
      echo "FAIL - Stability check failed for $flow"
      exit 1
    fi
  done

  echo "STABLE: $flow passed $REQUIRED_PASSES consecutive runs"
done

echo "=== All flows are stable ==="
```

### Manual Stability Check

Run each flow 5 times manually:

```bash
# Onboarding (5 runs)
for i in {1..5}; do echo "Run $i"; maestro test .maestro/flows/onboarding.yaml; done

# Timeline (5 runs)
for i in {1..5}; do echo "Run $i"; maestro test .maestro/flows/timeline.yaml; done

# Goals (5 runs)
for i in {1..5}; do echo "Run $i"; maestro test .maestro/flows/goals.yaml; done
```

### Documenting Flaky Steps

If a test fails during stability verification:

1. Note which step failed
2. Check for timing issues (add `waitForAnimationToEnd` or increase timeouts)
3. Verify testID is correctly applied
4. Document the fix in the flow file comments
5. Re-run stability verification from the beginning

---

## Troubleshooting

### Common Issues

#### 1. Element Not Found

```yaml
# Add longer timeout
- assertVisible:
    text: "FlowDay"
    timeout: 10000  # 10 seconds
```

#### 2. Animation Not Complete

```yaml
# Wait for animations
- waitForAnimationToEnd:
    timeout: 5000
```

#### 3. Keyboard Issues

```yaml
# Dismiss keyboard before tapping other elements
- hideKeyboard
- tapOn: "Submit"
```

#### 4. App Not Starting

```bash
# Verify app is installed
maestro device list

# Clear app state and retry
maestro test --clear-app-state .maestro/flows/onboarding.yaml
```

### Debug Mode

Run with verbose output:

```bash
maestro test --debug .maestro/flows/goals.yaml
```

### Screenshots on Failure

Screenshots are automatically taken on flow completion (configured in `config.yaml`). They are saved to:

```
~/.maestro/tests/<timestamp>/
```

---

## CI Integration

See `scripts/run-e2e-tests.sh` for the CI script with retry logic.

### GitHub Actions Example

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  e2e:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Maestro
        run: brew install maestro

      - name: Run E2E Tests
        env:
          TEST_EMAIL: ${{ secrets.TEST_EMAIL }}
          TEST_PASSWORD: ${{ secrets.TEST_PASSWORD }}
        run: ./scripts/run-e2e-tests.sh
```

---

## Flow Files Reference

| Flow | File | Purpose |
|------|------|---------|
| Onboarding | `.maestro/flows/onboarding.yaml` | Sign-in and onboarding flow |
| Timeline | `.maestro/flows/timeline.yaml` | Timeline viewing and block interactions |
| Goals | `.maestro/flows/goals.yaml` | Goal CRUD operations |

---

## Related Documentation

- [TestID Registry](./test-ids.md) - All testIDs used in the app
- [iOS Testing Checklist](./ios-checklist.md) - iOS-specific testing
- [Android Testing Checklist](./android-checklist.md) - Android-specific testing
- [Platform Differences](./platform-differences.md) - Cross-platform considerations
