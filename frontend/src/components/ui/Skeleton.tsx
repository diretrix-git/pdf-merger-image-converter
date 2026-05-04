import { cn } from '../../lib/utils'

interface SkeletonProps {
  className?: string
}

/**
 * Skeleton loading placeholder — pulsing shimmer block.
 * Use to represent content that is loading.
 */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-lg bg-gray-800/60',
        className
      )}
      aria-hidden="true"
    />
  )
}
