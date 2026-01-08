import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { GoalTemplateId } from '../constants/goalTemplates'

// Platform-agnostic dev check
const isDev = typeof __DEV__ !== 'undefined'
  ? __DEV__
  : (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production')

// Declare __DEV__ for TypeScript
declare const __DEV__: boolean | undefined

export interface GoalsUIState {
  activeTab: 'active' | 'archived'
  selectedGoalId: string | null
  selectedTemplateId: GoalTemplateId | null
  setActiveTab: (tab: GoalsUIState['activeTab']) => void
  setSelectedGoalId: (id: string | null) => void
  setSelectedTemplateId: (id: GoalTemplateId | null) => void
  clearSelectedTemplate: () => void
}

export const useGoalsUIStore = create<GoalsUIState>()(
  devtools(
    (set) => ({
      activeTab: 'active',
      selectedGoalId: null,
      selectedTemplateId: null,
      setActiveTab: (activeTab) => set({ activeTab }, false, 'setActiveTab'),
      setSelectedGoalId: (selectedGoalId) => set({ selectedGoalId }, false, 'setSelectedGoalId'),
      setSelectedTemplateId: (selectedTemplateId) => set({ selectedTemplateId }, false, 'setSelectedTemplateId'),
      clearSelectedTemplate: () => set({ selectedTemplateId: null }, false, 'clearSelectedTemplate'),
    }),
    { name: 'GoalsUIStore', enabled: isDev }
  )
)
