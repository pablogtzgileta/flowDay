import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { useState } from "react"

import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const Route = createFileRoute("/reset-password")({
  validateSearch: (search) => ({
    token: search.token as string,
  }),
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const { token } = Route.useSearch()
  const navigate = useNavigate()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!token) {
      setError("Reset token is missing. Please request a new reset link.")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setIsSubmitting(true)
    setError("")

    try {
      const result = await authClient.resetPassword({ token, newPassword: password })

      if (result.error) {
        setError(result.error.message || "Failed to reset password. The link may have expired.")
        return
      }

      navigate({ to: "/sign-in", search: { redirect: "/dashboard" } })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password. The link may have expired.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="mx-auto mt-20 max-w-md">
      <CardHeader>
        <CardTitle>Set New Password</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-destructive text-sm">{error}</p>}
          <Input
            type="password"
            placeholder="New password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
          />
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Updating..." : "Update Password"}
          </Button>
          <div className="text-center">
            <Link to="/forgot-password" className="text-sm text-muted-foreground hover:underline">
              Need a new reset link?
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
