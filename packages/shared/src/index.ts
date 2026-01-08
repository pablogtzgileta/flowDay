/**
 * @flow-day/shared
 * Shared code between web and mobile applications
 */

// Stores
export { useAgentStore, useGoalsUIStore } from './stores'
export type { Message, AgentState, GoalsUIState } from './stores'

// Constants
export { GOAL_TEMPLATES } from './constants'
export type {
  GoalTemplate,
  GoalTemplateId,
  GoalCategory,
  PreferredTime,
  EnergyLevel,
} from './constants'
