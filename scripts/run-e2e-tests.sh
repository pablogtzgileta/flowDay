#!/bin/bash
#
# FlowDay E2E Test Runner
#
# This script runs Maestro E2E tests with retry logic and artifact storage.
# Designed for CI integration but can also be run locally.
#
# Usage:
#   ./scripts/run-e2e-tests.sh [flow_name]
#
# Examples:
#   ./scripts/run-e2e-tests.sh           # Run all flows
#   ./scripts/run-e2e-tests.sh onboarding # Run only onboarding flow
#
# Environment Variables:
#   TEST_EMAIL    - Test account email (required)
#   TEST_PASSWORD - Test account password (required)
#   MAX_RETRIES   - Maximum retry attempts per flow (default: 3)
#   ARTIFACT_DIR  - Directory to store test artifacts (default: ./e2e-artifacts)
#

set -e

# Configuration
FLOW_DIR=".maestro/flows"
MAX_RETRIES=${MAX_RETRIES:-3}
ARTIFACT_DIR=${ARTIFACT_DIR:-"./e2e-artifacts"}
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Validate environment
validate_env() {
    if [ -z "$TEST_EMAIL" ]; then
        echo -e "${RED}ERROR: TEST_EMAIL environment variable is required${NC}"
        exit 1
    fi

    if [ -z "$TEST_PASSWORD" ]; then
        echo -e "${RED}ERROR: TEST_PASSWORD environment variable is required${NC}"
        exit 1
    fi

    # Check if Maestro is installed
    if ! command -v maestro &> /dev/null; then
        echo -e "${RED}ERROR: Maestro is not installed${NC}"
        echo "Install with: brew install maestro"
        exit 1
    fi

    echo -e "${GREEN}Environment validated successfully${NC}"
}

# Create artifact directory
setup_artifacts() {
    mkdir -p "$ARTIFACT_DIR/$TIMESTAMP"
    echo -e "${GREEN}Artifact directory: $ARTIFACT_DIR/$TIMESTAMP${NC}"
}

# Run a single flow with retries
run_flow() {
    local flow_path=$1
    local flow_name=$(basename "$flow_path" .yaml)
    local attempt=1
    local success=false

    echo ""
    echo -e "${YELLOW}========================================${NC}"
    echo -e "${YELLOW}Running: $flow_name${NC}"
    echo -e "${YELLOW}========================================${NC}"

    while [ $attempt -le $MAX_RETRIES ]; do
        echo -e "\n${YELLOW}Attempt $attempt of $MAX_RETRIES${NC}"

        # Run the test
        if maestro test "$flow_path" --output "$ARTIFACT_DIR/$TIMESTAMP/$flow_name"; then
            echo -e "${GREEN}PASS: $flow_name (attempt $attempt)${NC}"
            success=true
            break
        else
            echo -e "${RED}FAIL: $flow_name (attempt $attempt)${NC}"

            # Save failure screenshot if available
            if [ -d ~/.maestro/tests ]; then
                local latest_test=$(ls -td ~/.maestro/tests/*/ 2>/dev/null | head -1)
                if [ -n "$latest_test" ]; then
                    cp -r "$latest_test" "$ARTIFACT_DIR/$TIMESTAMP/${flow_name}_failure_attempt_${attempt}/" 2>/dev/null || true
                fi
            fi

            if [ $attempt -lt $MAX_RETRIES ]; then
                echo "Retrying in 5 seconds..."
                sleep 5
            fi
        fi

        attempt=$((attempt + 1))
    done

    if [ "$success" = false ]; then
        echo -e "${RED}FAILED: $flow_name after $MAX_RETRIES attempts${NC}"
        return 1
    fi

    return 0
}

# Run all flows
run_all_flows() {
    local specific_flow=$1
    local failed_flows=()
    local passed_flows=()

    if [ -n "$specific_flow" ]; then
        # Run specific flow
        local flow_path="$FLOW_DIR/${specific_flow}.yaml"
        if [ ! -f "$flow_path" ]; then
            echo -e "${RED}ERROR: Flow not found: $flow_path${NC}"
            exit 1
        fi

        if run_flow "$flow_path"; then
            passed_flows+=("$specific_flow")
        else
            failed_flows+=("$specific_flow")
        fi
    else
        # Run all flows
        for flow_path in "$FLOW_DIR"/*.yaml; do
            if [ -f "$flow_path" ]; then
                local flow_name=$(basename "$flow_path" .yaml)

                if run_flow "$flow_path"; then
                    passed_flows+=("$flow_name")
                else
                    failed_flows+=("$flow_name")
                fi
            fi
        done
    fi

    # Print summary
    echo ""
    echo -e "${YELLOW}========================================${NC}"
    echo -e "${YELLOW}TEST SUMMARY${NC}"
    echo -e "${YELLOW}========================================${NC}"

    if [ ${#passed_flows[@]} -gt 0 ]; then
        echo -e "${GREEN}Passed (${#passed_flows[@]}):${NC}"
        for flow in "${passed_flows[@]}"; do
            echo -e "  ${GREEN}✓ $flow${NC}"
        done
    fi

    if [ ${#failed_flows[@]} -gt 0 ]; then
        echo -e "${RED}Failed (${#failed_flows[@]}):${NC}"
        for flow in "${failed_flows[@]}"; do
            echo -e "  ${RED}✗ $flow${NC}"
        done
    fi

    echo ""
    echo "Artifacts saved to: $ARTIFACT_DIR/$TIMESTAMP"

    # Return failure if any flows failed
    if [ ${#failed_flows[@]} -gt 0 ]; then
        echo -e "${RED}E2E tests failed${NC}"
        return 1
    fi

    echo -e "${GREEN}All E2E tests passed!${NC}"
    return 0
}

# Cleanup old artifacts (keep last 10 runs)
cleanup_old_artifacts() {
    if [ -d "$ARTIFACT_DIR" ]; then
        local artifact_count=$(ls -1 "$ARTIFACT_DIR" 2>/dev/null | wc -l)
        if [ "$artifact_count" -gt 10 ]; then
            echo "Cleaning up old artifacts..."
            ls -1t "$ARTIFACT_DIR" | tail -n +11 | xargs -I {} rm -rf "$ARTIFACT_DIR/{}"
        fi
    fi
}

# Main
main() {
    echo ""
    echo "FlowDay E2E Test Runner"
    echo "======================="
    echo ""

    validate_env
    setup_artifacts
    cleanup_old_artifacts

    local exit_code=0
    if run_all_flows "$1"; then
        exit_code=0
    else
        exit_code=1
    fi

    exit $exit_code
}

# Run main with optional flow name argument
main "$1"
