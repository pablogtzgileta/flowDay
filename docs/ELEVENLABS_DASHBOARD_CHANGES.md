# ElevenLabs Dashboard Configuration Changes

**Date**: December 31, 2025
**Version**: 2.0 (8 Tools Full Power)
**Priority**: High

## Summary

This document provides step-by-step instructions for updating the ElevenLabs dashboard with all 8 AI agent tools. This update replaces the previous 2-tool configuration with a comprehensive 8-tool suite enabling full schedule management through natural conversation.

## Prerequisites

- Access to ElevenLabs dashboard
- Admin permissions for FlowDay agent configuration
- JSON file: `/docs/ELEVENLABS_DASHBOARD_CONFIG.json`

## Step-by-Step Dashboard Update Procedure

### Step 1: Backup Current Configuration

1. Log into the ElevenLabs dashboard
2. Navigate to **Agents** > **FlowDay** (or your agent name)
3. Go to **Tools** tab
4. Export/screenshot current tool configuration for backup
5. Save current system prompt text to a backup file

### Step 2: Remove Existing Tools

1. In the Tools tab, delete all existing tools:
   - `getScheduleForDate` (if exists)
   - `addTaskToSchedule` (if exists)
   - Any other tools previously configured

### Step 3: Add New Tools from JSON

Open `/docs/ELEVENLABS_DASHBOARD_CONFIG.json` and add each tool:

#### Tool 1: getScheduleForDate

```json
{
  "type": "function",
  "function": {
    "name": "getScheduleForDate",
    "description": "Get all scheduled blocks for a specific date. Returns an array of blocks with their times, titles, and status.",
    "parameters": {
      "type": "object",
      "properties": {
        "date": {
          "type": "string",
          "description": "The date to get schedule for (format: YYYY-MM-DD)"
        }
      },
      "required": ["date"]
    }
  }
}
```

**Verification**: After adding, say "What's on my schedule for tomorrow?" - should trigger this tool.

#### Tool 2: addTaskToSchedule

```json
{
  "type": "function",
  "function": {
    "name": "addTaskToSchedule",
    "description": "Add a new task/block to the schedule. Requires title, date, and time. Optionally link to a goal.",
    "parameters": {
      "type": "object",
      "properties": {
        "title": { "type": "string", "description": "The title/name of the task" },
        "date": { "type": "string", "description": "The date for the task (format: YYYY-MM-DD)" },
        "startTime": { "type": "string", "description": "Start time (format: HH:mm, 24-hour)" },
        "endTime": { "type": "string", "description": "End time (format: HH:mm, 24-hour)" },
        "requiresTravel": { "type": "boolean", "description": "Whether this task requires travel", "default": false },
        "goalId": { "type": "string", "description": "Optional goal ID to link this task to (document ID)" }
      },
      "required": ["title", "date", "startTime", "endTime"]
    }
  }
}
```

**Verification**: Say "Schedule a meeting at 2pm tomorrow for 30 minutes" - should create a block.

#### Tool 3: deleteBlock

```json
{
  "type": "function",
  "function": {
    "name": "deleteBlock",
    "description": "Delete a scheduled block from the calendar [Requires user confirmation before executing]",
    "parameters": {
      "type": "object",
      "properties": {
        "blockId": { "type": "string", "description": "The ID of the block to delete (document ID)" }
      },
      "required": ["blockId"]
    }
  }
}
```

**Verification**: Say "Delete my 2pm meeting" - should ask for confirmation before deleting.

#### Tool 4: updateBlock

```json
{
  "type": "function",
  "function": {
    "name": "updateBlock",
    "description": "Update an existing block's title, time, date, or other properties. Use newDate to move to a different day.",
    "parameters": {
      "type": "object",
      "properties": {
        "blockId": { "type": "string", "description": "The ID of the block to update (document ID)" },
        "title": { "type": "string", "description": "New title for the block" },
        "description": { "type": "string", "description": "New description for the block" },
        "startTime": { "type": "string", "description": "New start time (format: HH:mm, 24-hour)" },
        "endTime": { "type": "string", "description": "New end time (format: HH:mm, 24-hour)" },
        "newDate": { "type": "string", "description": "New date to move the block to (format: YYYY-MM-DD)" },
        "energyLevel": { "type": "string", "description": "Energy level required", "enum": ["high", "medium", "low"] }
      },
      "required": ["blockId"]
    }
  }
}
```

**Verification**: Say "Move my gym session to 7am" - should update the block time.

#### Tool 5: getAvailableSlots

```json
{
  "type": "function",
  "function": {
    "name": "getAvailableSlots",
    "description": "Find available time slots on a given date for scheduling a task. Returns up to 5 optimal slots based on energy matching.",
    "parameters": {
      "type": "object",
      "properties": {
        "date": { "type": "string", "description": "The date to check (format: YYYY-MM-DD)" },
        "durationMinutes": { "type": "number", "description": "Duration in minutes", "default": 60, "minimum": 5, "maximum": 480 },
        "energyLevel": { "type": "string", "description": "Energy level required", "enum": ["high", "medium", "low"] }
      },
      "required": ["date"]
    }
  }
}
```

**Verification**: Say "When can I fit a 2-hour workout tomorrow?" - should return available slots.

#### Tool 6: getGoalsProgress

```json
{
  "type": "function",
  "function": {
    "name": "getGoalsProgress",
    "description": "Get progress information for user's goals. Returns on-track status and weekly progress. Limited to 10 goals.",
    "parameters": {
      "type": "object",
      "properties": {
        "goalId": { "type": "string", "description": "Specific goal ID (document ID)" },
        "category": { "type": "string", "description": "Filter by category", "enum": ["learning", "health", "career", "personal", "creative"] }
      },
      "required": []
    }
  }
}
```

**Verification**: Say "How am I doing on my goals?" - should return progress summary.

#### Tool 7: calculateTravelTime

```json
{
  "type": "function",
  "function": {
    "name": "calculateTravelTime",
    "description": "Calculate travel time between two locations. Provide either location IDs or labels (e.g., 'Home', 'Office').",
    "parameters": {
      "type": "object",
      "properties": {
        "fromLocationId": { "type": "string", "description": "Starting location ID (document ID)" },
        "fromLocationLabel": { "type": "string", "description": "Starting location label (e.g., 'Home', 'Office')" },
        "toLocationId": { "type": "string", "description": "Destination location ID (document ID)" },
        "toLocationLabel": { "type": "string", "description": "Destination location label (e.g., 'Home', 'Office')" }
      },
      "required": []
    }
  }
}
```

**Verification**: Say "How long does it take to get from Home to Office?" - should return travel time.

#### Tool 8: showSchedulePreview

```json
{
  "type": "function",
  "function": {
    "name": "showSchedulePreview",
    "description": "Show a preview of proposed schedule blocks before creating them. Use for multiple blocks at once. Maximum 5 blocks per preview. [Requires user confirmation before executing]",
    "parameters": {
      "type": "object",
      "properties": {
        "blocks": {
          "type": "array",
          "description": "Array of proposed blocks (1-5 blocks)",
          "items": {
            "type": "object",
            "properties": {
              "title": { "type": "string" },
              "date": { "type": "string" },
              "startTime": { "type": "string" },
              "endTime": { "type": "string" },
              "description": { "type": "string" },
              "requiresTravel": { "type": "boolean" },
              "energyLevel": { "type": "string", "enum": ["high", "medium", "low"] }
            },
            "required": ["title", "date", "startTime", "endTime"]
          }
        }
      },
      "required": ["blocks"]
    }
  }
}
```

**Verification**: Say "Schedule gym every morning at 7am this week" - should show preview and ask for confirmation.

### Step 4: Update System Prompt

Update the system prompt using `/docs/ELEVENLABS_SYSTEM_PROMPT.md`.

### Step 5: Save and Test

1. Click **Save** to apply all changes
2. Run through the verification checklist below

## Verification Checklist

After updating, verify each tool works correctly:

| Tool | Test Command | Expected Behavior |
|------|--------------|-------------------|
| getScheduleForDate | "What's on my schedule for tomorrow?" | Returns schedule blocks |
| addTaskToSchedule | "Add a meeting at 3pm tomorrow" | Creates a new block |
| deleteBlock | "Delete my 3pm meeting" | Asks confirmation, then deletes |
| updateBlock | "Move the meeting to 4pm" | Updates block time |
| getAvailableSlots | "When am I free tomorrow?" | Returns available time slots |
| getGoalsProgress | "How are my goals doing?" | Returns progress summary |
| calculateTravelTime | "How long to get to the office?" | Returns travel time |
| showSchedulePreview | "Schedule gym every morning this week" | Shows preview, asks confirmation |

## Rollback Procedure

If issues arise after updating:

### Quick Rollback (< 5 minutes)

1. Go to **Agents** > **FlowDay** > **Tools**
2. Delete all 8 tools
3. Add back only the 2 original tools:
   - `getScheduleForDate`
   - `addTaskToSchedule`
4. Restore the previous system prompt from backup
5. Save changes

### Full Rollback

If the app is completely broken:

1. In the mobile app codebase, check for ROLLBACK markers:
   ```bash
   grep -r "ROLLBACK" apps/mobile/hooks/
   ```
2. Uncomment the legacy handler code in:
   - `/apps/mobile/hooks/useElevenLabs.ts`
   - `/apps/mobile/hooks/useVoiceAgent.ts`
3. Deploy the rollback version

### When to Rollback

Rollback immediately if:
- Tool calls consistently fail with errors
- Voice agent becomes unresponsive
- Users report scheduling not working
- Error rate exceeds 10% of tool calls

## Configuration Settings

### Tool Timeout

Recommended timeout settings per tool:
- Query tools (getScheduleForDate, getAvailableSlots, getGoalsProgress): 10 seconds
- Mutation tools (addTaskToSchedule, deleteBlock, updateBlock): 15 seconds
- External service tools (calculateTravelTime): 20 seconds
- Complex tools (showSchedulePreview): 15 seconds

### Response Size Limits

The tools enforce these limits to prevent context overflow:
- Goals returned: Maximum 10
- Blocks returned: Maximum 15
- Preview blocks: Maximum 5

## Notes

- Tools marked with `[Requires user confirmation before executing]` must wait for explicit user approval
- The `showSchedulePreview` tool should read the preview aloud before asking for confirmation
- Date format is always YYYY-MM-DD
- Time format is always HH:mm (24-hour)
- Location lookup supports both IDs and labels (case-insensitive)
