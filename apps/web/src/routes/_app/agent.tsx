import { createFileRoute } from "@tanstack/react-router"
import { useState, useRef, useEffect } from "react"
import { Send, Bot, User, Loader2 } from "lucide-react"

import { useAgentStore, type Message } from "@flow-day/shared"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const Route = createFileRoute("/_app/agent")({
  component: AgentPage,
})

function AgentPage() {
  const messages = useAgentStore((state) => state.messages)
  const addMessage = useAgentStore((state) => state.addMessage)
  const connectionStatus = useAgentStore((state) => state.connectionStatus)
  const setConnectionStatus = useAgentStore((state) => state.setConnectionStatus)

  const [input, setInput] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

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

    // Simulate agent response (replace with actual ElevenLabs/Convex integration)
    setTimeout(() => {
      const agentMessage: Message = {
        id: crypto.randomUUID(),
        text: "I'm your Flow Day AI assistant. In the full implementation, I'll help you plan your day, track goals, and optimize your schedule. For now, please use the mobile app for full voice interaction capabilities.",
        source: "assistant",
        timestamp: Date.now(),
      }
      addMessage(agentMessage)
      setIsProcessing(false)
      setConnectionStatus("connected")
    }, 1500)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="container max-w-4xl px-4 py-6">
      <Card className="flex h-[calc(100vh-12rem)] flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Agent
          </CardTitle>
          <CardDescription>
            Chat with your Flow Day assistant
            <span className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs ${
              connectionStatus === "connected"
                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                : connectionStatus === "connecting"
                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                  : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
            }`}>
              {connectionStatus}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-4 pb-4">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <Bot className="h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">
                  Start a conversation with your AI assistant
                </p>
                <p className="mt-2 text-sm text-muted-foreground/75">
                  Ask about your goals, schedule, or get productivity tips
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
            {isProcessing && (
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

          {/* Input */}
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
        </CardContent>
      </Card>
    </div>
  )
}
