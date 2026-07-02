import { cn } from "cnfast"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-accent animate-pulse rounded-md", className)}
      {...props}
    />
  )
}

function SkeletonWithDelay({ className, delay = 300, ...props }: React.ComponentProps<"div"> & { delay: number }) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-accent animate-pulse rounded-md", className)}
      style={{ animationDelay: `${delay}ms` }}
      {...props}
    />
  )
}

export { Skeleton, SkeletonWithDelay }
