import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

const MAX_MESSAGES = 100

// Platform-agnostic dev check
const isDev = typeof __DEV__ !== 'undefined'
  ? __DEV__
  : (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production')

// Declare __DEV__ for TypeScript
declare const __DEV__: boolean | undefined

export interface Message {
  id: string
  text: string
  source: 'user' | 'assistant' | 'system'
  timestamp: number
}

export interface AgentState {
  messages: Message[]
  connectionStatus: 'disconnected' | 'connecting' | 'connected'
  addMessage: (message: Message) => boolean
  setConnectionStatus: (status: AgentState['connectionStatus']) => void
  clearMessages: () => void
}

// Message validation
const isValidMessage = (msg: unknown): msg is Message => {
  if (!msg || typeof msg !== 'object') return false
  const m = msg as Record<string, unknown>
  return typeof m.id === 'string' &&
         typeof m.text === 'string' &&
         ['user', 'assistant', 'system'].includes(m.source as string) &&
         typeof m.timestamp === 'number'
}

export const useAgentStore = create<AgentState>()(
  devtools(
    (set) => ({
      messages: [],
      connectionStatus: 'disconnected',

      addMessage: (message): boolean => {
        if (!isValidMessage(message)) {
          console.warn('[useAgentStore] Invalid message rejected:', message)
          return false
        }

        set((state) => {
          const updated = [...state.messages, message]

          if (updated.length <= MAX_MESSAGES) {
            return { messages: updated }
          }

          // Preserve system message
          const firstMessage = updated[0]
          if (firstMessage?.source === 'system') {
            return { messages: [firstMessage, ...updated.slice(-(MAX_MESSAGES - 1))] }
          }

          return { messages: updated.slice(-MAX_MESSAGES) }
        }, false, 'addMessage')
        return true
      },

      setConnectionStatus: (status) => set(
        { connectionStatus: status },
        false,
        'setConnectionStatus'
      ),

      clearMessages: () => set({ messages: [] }, false, 'clearMessages'),
    }),
    { name: 'AgentStore', enabled: isDev }
  )
)
