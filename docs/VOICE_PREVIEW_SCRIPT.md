# Voice Preview Script

This document defines how the voice agent handles schedule preview confirmations.

## Overview

When a user requests to schedule multiple blocks at once (e.g., "Schedule gym every morning this week"), the agent uses `showSchedulePreview` to validate and present a preview before creating the blocks. This requires voice-specific handling for reading the preview aloud and processing the user's confirmation response.

## Tool Flag

The `showSchedulePreview` tool has `requiresConfirmation: true`, which tells the voice agent to:

1. Execute the tool to generate the preview
2. Read the preview to the user
3. Wait for user confirmation before proceeding
4. Either create the blocks (on confirm) or discard (on cancel)

## Voice Preview Script

### Reading the Preview

When the preview is generated successfully, the agent should read it in this format:

**For valid previews (all blocks can be scheduled):**

```
I've prepared [N] blocks for your schedule:

Block 1: [Title] on [Day, Month Date] from [Start] to [End]
Block 2: [Title] on [Day, Month Date] from [Start] to [End]
...

All blocks are ready to be scheduled. Say "confirm" or "yes" to create them, or "cancel" to discard.
```

**For previews with conflicts:**

```
I've checked your schedule and found some issues:

Block 1: [Title] - Conflicts with [Existing Block Title]
Block 2: [Title] - OK
Block 3: [Title] - Conflicts with Block 1

Would you like to adjust the times and try again, or say "cancel" to discard this preview?
```

**For previews with format errors:**

```
There's an issue with the schedule details:

Block 1: [Title] - Invalid date format
Block 2: [Title] - End time must be after start time

Please provide the correct details and try again.
```

### Time Format for Voice

Convert 24-hour times to natural speech:

| Time | Voice Format |
|------|-------------|
| 07:00 | 7 AM |
| 09:30 | 9:30 AM |
| 12:00 | noon |
| 13:00 | 1 PM |
| 14:30 | 2:30 PM |
| 00:00 | midnight |

### Date Format for Voice

Convert dates to natural speech:

| Date | Voice Format |
|------|-------------|
| 2025-01-06 | Monday, January 6th |
| 2025-01-07 | Tuesday, January 7th |
| Today's date | today |
| Tomorrow's date | tomorrow |

## Confirmation Handling

### Accepted Confirmations

The following phrases are accepted as confirmation (case-insensitive):

- "yes"
- "yep"
- "yeah"
- "sure"
- "confirm"
- "do it"
- "okay"
- "ok"
- "go ahead"
- "sounds good"
- "that works"
- "create them"
- "schedule them"

### Rejected Confirmations

The following phrases are treated as cancellation:

- "no"
- "nope"
- "cancel"
- "wait"
- "stop"
- "nevermind"
- "never mind"
- "hold on"
- "don't"
- "forget it"
- "discard"

### Ambiguous Responses

If the response is ambiguous, the agent should ask for clarification:

```
I didn't catch that. Was that a yes to create the blocks, or a no to cancel?
```

### Timeout Behavior

If no response is received within 5 seconds:

1. First timeout: Prompt again
   ```
   Should I go ahead and create these [N] blocks? Say "yes" to confirm or "no" to cancel.
   ```

2. Second timeout: Cancel and inform
   ```
   I'll cancel this preview since I didn't get a response. Just let me know when you want to try again.
   ```

## Post-Confirmation Actions

### On Confirmation

1. The agent creates each block using `addTaskToSchedule`
2. After all blocks are created, provide summary:
   ```
   Done! I've added [N] blocks to your schedule: [brief summary].
   ```

### On Cancellation

1. Discard the preview
2. Acknowledge:
   ```
   Okay, I've canceled the preview. Let me know if you'd like to schedule something else.
   ```

### On Partial Failure

If some blocks fail to create after confirmation:

```
I was able to create [X] of [N] blocks. [Y] blocks failed due to [reason].
Would you like me to try those again with different times?
```

## Edge Cases

### Single Block Preview

For a single block, adjust the language:

```
I'll schedule [Title] on [Date] from [Start] to [End].
Should I create this block?
```

### Maximum Blocks (5)

If the user requests more than 5 blocks:

```
I can only preview up to 5 blocks at a time. Let's start with the first 5 and then do the rest after.
```

### Same Day Multiple Blocks

When multiple blocks are on the same day:

```
I've prepared 3 blocks for Monday, January 6th:

1. [Title] from 7 to 8 AM
2. [Title] from 12 to 1 PM
3. [Title] from 6 to 7 PM

Should I add all three to your schedule?
```

## System Prompt Addition

Add this to the ElevenLabs system prompt:

```
## Schedule Preview Tool

When using showSchedulePreview:
1. Always read the preview aloud clearly before asking for confirmation
2. Wait for explicit user confirmation before creating blocks
3. Use natural time formats (e.g., "7 AM" not "07:00")
4. Use natural date formats (e.g., "Monday, January 6th")
5. If conflicts are detected, explain which blocks conflict
6. Accept common confirmation phrases: yes, yep, sure, confirm, ok, go ahead
7. Accept common cancellation phrases: no, cancel, wait, stop, nevermind
8. If response is unclear, ask: "Was that a yes or no?"
9. Timeout after 5 seconds, prompt once, then cancel on second timeout
10. After confirmation, create blocks one by one and report summary
```

## Implementation Notes

1. The `showSchedulePreview` tool returns `blocksToCreate` in the response when valid
2. Use this array to create blocks on confirmation (no need to re-validate)
3. The `confirmationPrompt` in the response provides the exact prompt text
4. Track preview state in the conversation to handle confirmation responses
