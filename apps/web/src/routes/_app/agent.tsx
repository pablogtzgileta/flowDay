import { createFileRoute } from "@tanstack/react-router"
import { useState, useRef, useEffect, useCallback } from "react"
import { Send, Bot, User, Loader2 } from "lucide-react"
import { useAction } from "convex/react"
import { api } from "@flow-day/convex"

import { useAgentStore, type Message } from "@flow-day/shared"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { VoiceModeToggle, type AgentMode } from "@/components/agent/voice-mode-toggle"
import { VoiceButton } from "@/components/agent/voice-button"
import { useVoiceAgent } from "@/hooks/use-voice-agent"

export const Route = createFileRoute("/_app/agent")({
  component: AgentPage,
})

function AgentPage() {
  const messages = useAgentStore((state) => state.messages)
  const addMessage = useAgentStore((state) => state.addMessage)
  const connectionStatus = useAgentStore((state) => state.connectionStatus)
  const setConnectionStatus = useAgentStore((state) => state.setConnectionStatus)
  const error = useAgentStore((state) => state.error)
  const setError = useAgentStore((state) => state.setError)
  const clearError = useAgentStore((state) => state.clearError)

  const chat = useAction(api.agent.chat)

  const [input, setInput] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [agentMode, setAgentMode] = useState<AgentMode>("text")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Voice agent hook
  const voiceAgent = useVoiceAgent()

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Handle mode change - disconnect voice when switching to text
  const handleModeChange = useCallback(async (newMode: AgentMode) => {
    if (newMode === "text" && voiceAgent.connectionState !== "disconnected") {
      // Disconnect voice session when switching to text mode
      await voiceAgent.disconnect()
    }
    setAgentMode(newMode)
    // Clear any text mode error when switching
    if (newMode === "voice") {
      clearError()
    }
  }, [voiceAgent, clearError])

  // Handle voice button click
  const handleVoiceClick = useCallback(async () => {
    if (voiceAgent.connectionState === "connected") {
      await voiceAgent.disconnect()
    } else if (voiceAgent.connectionState === "disconnected" || voiceAgent.connectionState === "error") {
      await voiceAgent.connect()
    }
  }, [voiceAgent])

  const handleSendMessage = async () => {
    if (!input.trim() || isProcessing) return

    const userMessage: Message = {
      id: crypto.randomUUID(),
      text: input.trim(),
      source: "user",
      timestamp: Date.now(),
    }

    addMessage(userMessage)
    setInput("")
    setIsProcessing(true)
    setConnectionStatus("connecting")
    clearError()

    try {
      const response = await chat({ message: input.trim() })
      const agentMessage: Message = {
        id: crypto.randomUUID(),
        text: response.text,
        source: "assistant",
        timestamp: Date.now(),
      }
      addMessage(agentMessage)
      setConnectionStatus("connected")
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to get response"
      setError(errorMessage)
      setConnectionStatus("disconnected")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Determine which error to show
  const displayError = agentMode === "voice" ? voiceAgent.error : error

  // Determine connection status display
  const displayConnectionStatus = agentMode === "voice"
    ? voiceAgent.connectionState
    : connectionStatus

  return (
    <div className="container max-w-4xl px-4 py-6">
      <Card className="flex h-[calc(100vh-12rem)] flex-col">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                AI Agent
              </CardTitle>
              <CardDescription className="mt-1">
                Chat with your Flow Day assistant
                <span className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs ${
                  displayConnectionStatus === "connected"
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    : displayConnectionStatus === "connecting"
                      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                      : displayConnectionStatus === "error"
                        ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                }`}>
                  {displayConnectionStatus}
                </span>
              </CardDescription>
            </div>
            {/* Mode toggle */}
            <VoiceModeToggle
              mode={agentMode}
              onModeChange={handleModeChange}
              disabled={isProcessing || voiceAgent.connectionState === "connecting"}
            />
          </div>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col overflow-hidden">
          {/* Error display */}
          {displayError && (
            <div className="mb-4 flex items-center justify-between rounded-lg bg-destructive/10 px-4 py-2 text-destructive">
              <span className="text-sm">{displayError}</span>
              <button
                onClick={() => {
                  if (agentMode === "text") {
                    clearError()
                  }
                  // Voice errors are managed by the hook
                }}
                className="ml-2 text-xs underline hover:no-underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-4 pb-4">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <Bot className="h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">
                  Start a conversation with your AI assistant
                </p>
                <p className="mt-2 text-sm text-muted-foreground/75">
                  {agentMode === "voice"
                    ? "Click the microphone button to start talking"
                    : "Ask about your goals, schedule, or get productivity tips"
                  }
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.source === "user" ? "justify-end" : ""}`}
                >
                  {message.source !== "user" && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      message.source === "user"
                        ? "bg-primary text-primary-foreground"
                        : message.source === "system"
                          ? "bg-muted text-muted-foreground italic"
                          : "bg-secondary"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                    <p className="mt-1 text-xs opacity-60">
                      {new Date(message.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  {message.source === "user" && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))
            )}
            {isProcessing && agentMode === "text" && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area - changes based on mode */}
          {agentMode === "text" ? (
            <div className="flex gap-2 border-t pt-4">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Type your message..."
                disabled={isProcessing}
                className="flex-1"
              />
              <Button onClick={handleSendMessage} disabled={!input.trim() || isProcessing}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 border-t pt-6 pb-2">
              <VoiceButton
                connectionState={voiceAgent.connectionState}
                voiceMode={voiceAgent.voiceMode}
                remainingMinutes={voiceAgent.remainingMinutes}
                onClick={handleVoiceClick}
              />
              {/* Session duration display when connected */}
              {voiceAgent.connectionState === "connected" && voiceAgent.sessionDuration > 0 && (
                <span className="text-xs text-muted-foreground">
                  Session: {Math.floor(voiceAgent.sessionDuration / 60)}:{(voiceAgent.sessionDuration % 60).toString().padStart(2, "0")}
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
