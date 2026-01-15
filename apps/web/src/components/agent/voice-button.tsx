import { Mic, Loader2, Volume2, MoreHorizontal, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ConnectionState, VoiceMode } from "@/hooks/use-voice-agent"

interface VoiceButtonProps {
  connectionState: ConnectionState
  voiceMode: VoiceMode
  remainingMinutes: number
  onClick: () => void
  disabled?: boolean
  className?: string
}

export function VoiceButton({
  connectionState,
  voiceMode,
  remainingMinutes,
  onClick,
  disabled = false,
  className,
}: VoiceButtonProps) {
  // Determine effective state for display
  const isConnecting = connectionState === "connecting"
  const isConnected = connectionState === "connected"
  const isError = connectionState === "error"
  const isListening = isConnected && voiceMode === "listening"
  const isSpeaking = isConnected && voiceMode === "speaking"
  const isProcessing = isConnected && voiceMode === "processing"

  // Show warning when low on minutes
  const showWarning = remainingMinutes <= 5 && remainingMinutes > 0
  const noMinutesLeft = remainingMinutes <= 0

  // Get button styles based on state
  const getButtonStyles = () => {
    if (isError || noMinutesLeft) {
      return "bg-destructive text-destructive-foreground hover:bg-destructive/90"
    }
    if (isConnecting) {
      return "bg-yellow-500 text-white hover:bg-yellow-500"
    }
    if (isListening) {
      return "bg-red-500 text-white hover:bg-red-600 animate-voice-pulse"
    }
    if (isSpeaking) {
      return "bg-blue-500 text-white hover:bg-blue-600"
    }
    if (isProcessing) {
      return "bg-purple-500 text-white hover:bg-purple-500"
    }
    // Idle state
    return "bg-primary text-primary-foreground hover:bg-primary/90"
  }

  // Get icon based on state
  const getIcon = () => {
    if (isError || noMinutesLeft) {
      return <AlertCircle className="h-6 w-6" />
    }
    if (isConnecting) {
      return <Loader2 className="h-6 w-6 animate-spin" />
    }
    if (isListening) {
      return <Mic className="h-6 w-6 animate-voice-mic" />
    }
    if (isSpeaking) {
      return <Volume2 className="h-6 w-6 animate-voice-volume" />
    }
    if (isProcessing) {
      return <MoreHorizontal className="h-6 w-6 animate-pulse" />
    }
    // Idle state
    return <Mic className="h-6 w-6" />
  }

  // Get status text
  const getStatusText = () => {
    if (noMinutesLeft) return "No minutes left"
    if (isError) return "Error"
    if (isConnecting) return "Connecting..."
    if (isListening) return "Listening"
    if (isSpeaking) return "Speaking"
    if (isProcessing) return "Processing"
    return "Start Voice"
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={onClick}
        disabled={disabled || isConnecting || noMinutesLeft}
        className={cn(
          "flex h-16 w-16 items-center justify-center rounded-full transition-all duration-200",
          "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          getButtonStyles(),
          className
        )}
        title={getStatusText()}
        aria-label={getStatusText()}
      >
        {getIcon()}
      </button>

      {/* Status text */}
      <span className="text-sm text-muted-foreground">{getStatusText()}</span>

      {/* Remaining minutes warning */}
      {showWarning && (
        <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {remainingMinutes} min remaining
        </span>
      )}
    </div>
  )
}
