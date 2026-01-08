/**
 * Goal Templates - Pre-defined goal configurations for quick creation
 * Uses `as const` for full TypeScript type inference
 */

export const GOAL_TEMPLATES = [
  {
    id: "learn-language",
    title: "Learn a new language",
    category: "learning",
    weeklyTargetMinutes: 300,
    preferredTime: "morning",
    energyLevel: "high",
  },
  {
    id: "read-books",
    title: "Read more books",
    category: "learning",
    weeklyTargetMinutes: 180,
    preferredTime: "evening",
    energyLevel: "low",
  },
  {
    id: "exercise",
    title: "Exercise regularly",
    category: "health",
    weeklyTargetMinutes: 240,
    preferredTime: "morning",
    energyLevel: "high",
  },
  {
    id: "meditation",
    title: "Meditation practice",
    category: "health",
    weeklyTargetMinutes: 105,
    preferredTime: "morning",
    energyLevel: "medium",
  },
  {
    id: "side-project",
    title: "Side project work",
    category: "career",
    weeklyTargetMinutes: 300,
    preferredTime: "afternoon",
    energyLevel: "high",
  },
  {
    id: "instrument",
    title: "Learn an instrument",
    category: "creative",
    weeklyTargetMinutes: 180,
    preferredTime: "evening",
    energyLevel: "medium",
  },
] as const;

export type GoalTemplate = (typeof GOAL_TEMPLATES)[number];
export type GoalTemplateId = GoalTemplate["id"];
export type GoalCategory = GoalTemplate["category"];
export type PreferredTime = GoalTemplate["preferredTime"];
export type EnergyLevel = GoalTemplate["energyLevel"];
