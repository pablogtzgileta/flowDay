import { createFileRoute } from "@tanstack/react-router"
import { Settings } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
})

function SettingsPage() {
  return (
    <div className="container max-w-4xl space-y-6 px-4 py-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and preferences
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Coming Soon
          </CardTitle>
          <CardDescription>
            Settings will be available in a future update
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Check back later for account settings, notification preferences, and more.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
