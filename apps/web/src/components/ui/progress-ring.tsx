import { cn } from "@/lib/utils"

interface ProgressRingProps {
  progress: number // 0-100
  size?: number
  strokeWidth?: number
  showPercentage?: boolean
  color?: string
  backgroundColor?: string
  className?: string
}

export function ProgressRing({
  progress,
  size = 60,
  strokeWidth = 6,
  showPercentage = true,
  color = "currentColor",
  backgroundColor = "currentColor",
  className,
}: ProgressRingProps) {
  // Clamp progress between 0-100
  const clampedProgress = Math.max(0, Math.min(100, progress))

  // Calculate SVG values
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const strokeDashoffset = circumference - (clampedProgress / 100) * circumference

  // Center point
  const center = size / 2

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={clampedProgress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${clampedProgress}% complete`}
    >
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="none"
          className="opacity-20"
        />
        {/* Progress circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-500 ease-out"
        />
      </svg>

      {showPercentage && (
        <span
          className="absolute text-center font-semibold"
          style={{ fontSize: size * 0.22 }}
        >
          {Math.round(clampedProgress)}%
        </span>
      )}
    </div>
  )
}
