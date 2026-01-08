/**
 * Shared type definitions used across web and mobile apps
 */

// Re-export store types
export type { Message, AgentState } from '../stores/useAgentStore'
export type { GoalsUIState } from '../stores/useGoalsUIStore'

// Re-export constant types
export type {
  GoalTemplate,
  GoalTemplateId,
  GoalCategory,
  PreferredTime,
  EnergyLevel,
} from '../constants/goalTemplates'
