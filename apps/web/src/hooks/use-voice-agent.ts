import { useState, useCallback, useRef, useEffect } from "react"
import { useConversation } from "@elevenlabs/react"
import { useAction, useQuery, useMutation } from "convex/react"
import { api } from "@flow-day/convex"
import { useAgentStore } from "@flow-day/shared"
import { format } from "date-fns"

export type ConnectionState = "disconnected" | "connecting" | "connected" | "error"
export type VoiceMode = "idle" | "listening" | "speaking" | "processing"

export interface UseVoiceAgentReturn {
  // Connection state
  connectionState: ConnectionState
  voiceMode: VoiceMode
  error: string | null

  // Actions
  connect: () => Promise<void>
  disconnect: () => Promise<void>

  // Session info
  sessionDuration: number // in seconds
  conversationId: string | null

  // Usage
  remainingMinutes: number

  // Microphone permission
  microphonePermission: PermissionState | null
  requestMicrophonePermission: () => Promise<boolean>
}

export function useVoiceAgent(): UseVoiceAgentReturn {
  // Connection and voice state
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected")
  const [voiceMode, setVoiceMode] = useState<VoiceMode>("idle")
  const [error, setError] = useState<string | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [microphonePermission, setMicrophonePermission] = useState<PermissionState | null>(null)

  // Session duration tracking
  const [sessionDuration, setSessionDuration] = useState(0)
  const sessionStartRef = useRef<number | null>(null)
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Message store integration
  const addMessage = useAgentStore((state) => state.addMessage)

  // Convex actions and queries
  const getConversationToken = useAction(api.agent.getConversationToken)
  const getAgentContext = useQuery(api.agent.getAgentContext, {
    clientDate: format(new Date(), "yyyy-MM-dd"),
  })
  const voiceUsage = useQuery(api.agent.getVoiceUsage)
  const trackVoiceUsage = useMutation(api.agent.trackVoiceUsage)

  // ElevenLabs conversation hook
  const conversation = useConversation({
    onConnect: () => {
      setConnectionState("connected")
      setVoiceMode("listening")
      sessionStartRef.current = Date.now()

      // Start duration tracking
      durationIntervalRef.current = setInterval(() => {
        if (sessionStartRef.current) {
          setSessionDuration(Math.floor((Date.now() - sessionStartRef.current) / 1000))
        }
      }, 1000)

      // Add system message about voice mode
      addMessage({
        id: crypto.randomUUID(),
        text: "Voice mode connected. Start speaking...",
        source: "system",
        timestamp: Date.now(),
      })
    },
    onDisconnect: async () => {
      setConnectionState("disconnected")
      setVoiceMode("idle")

      // Stop duration tracking
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
        durationIntervalRef.current = null
      }

      // Track usage if we had a session
      if (sessionStartRef.current) {
        const durationMinutes = Math.ceil((Date.now() - sessionStartRef.current) / 60000)
        if (durationMinutes > 0) {
          try {
            await trackVoiceUsage({ minutes: durationMinutes })
          } catch (e) {
            console.error("Failed to track voice usage:", e)
          }
        }
      }

      sessionStartRef.current = null
      setSessionDuration(0)
      setConversationId(null)

      // Add system message about disconnect
      addMessage({
        id: crypto.randomUUID(),
        text: "Voice mode disconnected.",
        source: "system",
        timestamp: Date.now(),
      })
    },
    onMessage: (message) => {
      // Handle incoming messages from the conversation
      if (message.source === "user") {
        // User's transcribed speech
        addMessage({
          id: crypto.randomUUID(),
          text: message.message,
          source: "user",
          timestamp: Date.now(),
        })
        setVoiceMode("processing")
      } else if (message.source === "ai") {
        // AI response
        addMessage({
          id: crypto.randomUUID(),
          text: message.message,
          source: "assistant",
          timestamp: Date.now(),
        })
      }
    },
    onError: (errorMessage) => {
      console.error("Voice conversation error:", errorMessage)
      setError(typeof errorMessage === "string" ? errorMessage : "Voice connection error")
      setConnectionState("error")
      setVoiceMode("idle")
    },
  })

  // Track speaking state from ElevenLabs hook
  useEffect(() => {
    if (connectionState === "connected") {
      if (conversation.isSpeaking) {
        setVoiceMode("speaking")
      } else if (voiceMode === "speaking" || voiceMode === "processing") {
        // Agent finished speaking, go back to listening
        setVoiceMode("listening")
      }
    }
  }, [conversation.isSpeaking, connectionState, voiceMode])

  // Check microphone permission on mount
  useEffect(() => {
    checkMicrophonePermission()
  }, [])

  const checkMicrophonePermission = useCallback(async () => {
    try {
      // Check if permissions API is available
      if (navigator.permissions && navigator.permissions.query) {
        const result = await navigator.permissions.query({ name: "microphone" as PermissionName })
        setMicrophonePermission(result.state)

        // Listen for permission changes
        result.addEventListener("change", () => {
          setMicrophonePermission(result.state)
        })
      }
    } catch {
      // Permissions API not fully supported in this browser
      // Will check on first use via getUserMedia instead
    }
  }, [])

  const requestMicrophonePermission = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      // Immediately stop the stream - we just needed to trigger the permission request
      stream.getTracks().forEach(track => track.stop())
      setMicrophonePermission("granted")
      return true
    } catch (e) {
      if (e instanceof Error) {
        if (e.name === "NotAllowedError" || e.name === "PermissionDeniedError") {
          setMicrophonePermission("denied")
          setError("Microphone permission denied. Please enable microphone access in your browser settings.")
        } else if (e.name === "NotFoundError") {
          setError("No microphone found. Please connect a microphone and try again.")
        } else {
          setError(`Microphone error: ${e.message}`)
        }
      }
      return false
    }
  }, [])

  const connect = useCallback(async () => {
    // Clear any previous errors
    setError(null)

    // Check remaining minutes
    if (voiceUsage && voiceUsage.remainingMinutes <= 0) {
      setError("You've used all your voice minutes for this month. Minutes reset at the start of each month.")
      return
    }

    // Check/request microphone permission
    if (microphonePermission !== "granted") {
      const granted = await requestMicrophonePermission()
      if (!granted) {
        return
      }
    }

    setConnectionState("connecting")

    try {
      // Get conversation token from Convex (which handles rate limiting and API key)
      const token = await getConversationToken()

      // Start the conversation with WebRTC
      const id = await conversation.startSession({
        conversationToken: token,
        connectionType: "webrtc",
        // Pass dynamic variables from agent context
        dynamicVariables: getAgentContext ? {
          user_name: getAgentContext.user_name,
          wake_time: getAgentContext.wake_time,
          sleep_time: getAgentContext.sleep_time,
          peak_energy: getAgentContext.peak_energy,
          today_date: getAgentContext.today_date,
          tomorrow_date: getAgentContext.tomorrow_date,
          today_schedule: getAgentContext.today_schedule,
          tomorrow_schedule: getAgentContext.tomorrow_schedule,
          goals_summary: getAgentContext.goals_summary,
          locations: getAgentContext.locations,
          travel_times: getAgentContext.travel_times,
          current_energy: getAgentContext.current_energy,
          energy_schedule: getAgentContext.energy_schedule,
          lazy_mode: getAgentContext.lazy_mode,
          energy_tips: getAgentContext.energy_tips,
          weekly_review: getAgentContext.weekly_review,
        } : undefined,
      })

      setConversationId(id)
    } catch (e) {
      console.error("Failed to connect voice:", e)
      setError(e instanceof Error ? e.message : "Failed to connect to voice agent")
      setConnectionState("error")
    }
  }, [
    conversation,
    getConversationToken,
    getAgentContext,
    voiceUsage,
    microphonePermission,
    requestMicrophonePermission,
  ])

  const disconnect = useCallback(async () => {
    try {
      await conversation.endSession()
    } catch (e) {
      console.error("Error disconnecting:", e)
    }
    // State updates will happen in onDisconnect callback
  }, [conversation])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
      }
    }
  }, [])

  return {
    connectionState,
    voiceMode,
    error,
    connect,
    disconnect,
    sessionDuration,
    conversationId,
    remainingMinutes: voiceUsage?.remainingMinutes ?? 15,
    microphonePermission,
    requestMicrophonePermission,
  }
}
