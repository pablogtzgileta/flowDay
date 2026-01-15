import { useEffect, useCallback } from "react"
import { useNavigate } from "@tanstack/react-router"

interface ShortcutHandlers {
  onCommandPalette?: () => void
  onNewGoal?: () => void
  onEscape?: () => void
}

/**
 * Hook for handling global keyboard shortcuts
 * - Cmd/Ctrl + K: Command palette or navigate to agent
 * - Cmd/Ctrl + N: New goal (triggers callback)
 * - Cmd/Ctrl + G: Go to goals
 * - Cmd/Ctrl + D: Go to dashboard
 * - Cmd/Ctrl + Shift + S: Go to scheduler
 * - Cmd/Ctrl + T: Go to timeline (main daily view)
 * - Cmd/Ctrl + Shift + R: Go to weekly review
 * - Escape: Close modals (triggers callback)
 */
export function useKeyboardShortcuts(handlers: ShortcutHandlers = {}) {
  const navigate = useNavigate()

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0
      const modifier = isMac ? event.metaKey : event.ctrlKey

      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement
      const isInputElement =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable

      // Escape always works, even in inputs
      if (event.key === "Escape") {
        handlers.onEscape?.()
        return
      }

      // Skip other shortcuts when in input fields
      if (isInputElement) return

      // Cmd/Ctrl + K: Command palette / AI Agent
      if (modifier && event.key === "k") {
        event.preventDefault()
        if (handlers.onCommandPalette) {
          handlers.onCommandPalette()
        } else {
          navigate({ to: "/agent" })
        }
        return
      }

      // Cmd/Ctrl + N: New goal
      if (modifier && event.key === "n") {
        event.preventDefault()
        handlers.onNewGoal?.()
        return
      }

      // Cmd/Ctrl + G: Go to goals
      if (modifier && event.key === "g") {
        event.preventDefault()
        navigate({ to: "/goals" })
        return
      }

      // Cmd/Ctrl + D: Go to dashboard
      if (modifier && event.key === "d") {
        event.preventDefault()
        navigate({ to: "/dashboard" })
        return
      }

      // Cmd/Ctrl + Shift + S: Go to scheduler (Cmd+S often conflicts with browser save)
      if (modifier && event.shiftKey && event.key === "S") {
        event.preventDefault()
        navigate({ to: "/scheduler" })
        return
      }

      // Cmd/Ctrl + T: Go to timeline (Note: Cmd+T usually opens new tab, but we handle it anyway)
      // Browser may intercept this, but it works when focus is on the page
      if (modifier && event.key === "t") {
        event.preventDefault()
        navigate({ to: "/timeline" })
        return
      }

      // Cmd/Ctrl + Shift + R: Go to weekly review (Cmd+R is hard refresh, so use Shift+R)
      if (modifier && event.shiftKey && event.key === "R") {
        event.preventDefault()
        navigate({ to: "/review" })
        return
      }
    },
    [navigate, handlers]
  )

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])
}
