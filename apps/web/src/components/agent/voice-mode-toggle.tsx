import { MessageSquare, Mic } from "lucide-react"
import { cn } from "@/lib/utils"

export type AgentMode = "text" | "voice"

interface VoiceModeToggleProps {
  mode: AgentMode
  onModeChange: (mode: AgentMode) => void
  disabled?: boolean
  className?: string
}

export function VoiceModeToggle({
  mode,
  onModeChange,
  disabled = false,
  className,
}: VoiceModeToggleProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full bg-muted p-1",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      <button
        onClick={() => onModeChange("text")}
        disabled={disabled}
        className={cn(
          "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200",
          mode === "text"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
          disabled && "pointer-events-none"
        )}
        aria-pressed={mode === "text"}
      >
        <MessageSquare className="h-4 w-4" />
        <span>Text</span>
      </button>
      <button
        onClick={() => onModeChange("voice")}
        disabled={disabled}
        className={cn(
          "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200",
          mode === "voice"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
          disabled && "pointer-events-none"
        )}
        aria-pressed={mode === "voice"}
      >
        <Mic className="h-4 w-4" />
        <span>Voice</span>
      </button>
    </div>
  )
}
