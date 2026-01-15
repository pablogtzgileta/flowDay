import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface PresetCardProps {
  emoji: string
  label: string
  description: string
  selected: boolean
  onClick: () => void
}

export function PresetCard({
  emoji,
  label,
  description,
  selected,
  onClick,
}: PresetCardProps) {
  return (
    <Card
      onClick={onClick}
      className={cn(
        "cursor-pointer p-4 transition-all hover:border-primary/50",
        selected
          ? "border-primary bg-primary/5 ring-1 ring-primary"
          : "border-border hover:bg-accent/50"
      )}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">{emoji}</span>
        <div className="flex-1">
          <div className="font-semibold">{label}</div>
          <div className="text-sm text-muted-foreground">{description}</div>
        </div>
      </div>
    </Card>
  )
}
