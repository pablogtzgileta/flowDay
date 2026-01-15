import { cn } from "@/lib/utils"

interface TimeBlockSkeletonProps {
  className?: string
}

export function TimeBlockSkeleton({ className }: TimeBlockSkeletonProps) {
  return (
    <div
      className={cn(
        "relative rounded-lg p-4 border-l-4 border-l-gray-200 dark:border-l-gray-700 bg-gray-50 dark:bg-gray-900/50",
        className
      )}
    >
      {/* Time range skeleton */}
      <div className="flex items-center gap-2 mb-2">
        <div className="h-3.5 w-3.5 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
        <div className="h-4 w-28 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
        <div className="h-3 w-14 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
      </div>

      {/* Title skeleton */}
      <div className="h-5 w-3/4 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />

      {/* Description skeleton */}
      <div className="h-4 w-full rounded bg-gray-200 dark:bg-gray-700 animate-pulse mt-2" />
      <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-gray-700 animate-pulse mt-1" />

      {/* Metadata row skeleton */}
      <div className="flex items-center gap-3 mt-3">
        <div className="h-6 w-20 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
        <div className="h-6 w-24 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
      </div>
    </div>
  )
}

interface TimeBlockSkeletonListProps {
  count?: number
}

export function TimeBlockSkeletonList({ count = 5 }: TimeBlockSkeletonListProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <TimeBlockSkeleton key={index} />
      ))}
    </div>
  )
}
