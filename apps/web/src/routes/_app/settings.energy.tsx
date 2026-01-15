import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowLeft, Zap } from "lucide-react"

import { Button } from "@/components/ui/button"
import { PageLoading } from "@/components/ui/loading-spinner"
import { EnergyProfileEditor } from "@/components/settings/energy-profile-editor"

export const Route = createFileRoute("/_app/settings/energy")({
  component: EnergySettingsPage,
  pendingComponent: () => <PageLoading message="Loading energy settings..." />,
})

function EnergySettingsPage() {
  return (
    <div className="container max-w-4xl space-y-6 px-4 py-6">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/settings">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <Zap className="h-6 w-6 text-yellow-500" />
          <h1 className="text-2xl font-bold tracking-tight">Energy Profile</h1>
        </div>
      </div>

      <p className="text-muted-foreground">
        Customize your energy levels throughout the day. FlowDay uses this to schedule
        tasks at optimal times based on your natural energy patterns.
      </p>

      {/* Energy Profile Editor */}
      <EnergyProfileEditor />
    </div>
  )
}
