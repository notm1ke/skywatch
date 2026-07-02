// Tremor Tracker [v1.0.0]

import React, { ReactNode } from "react"
import * as HoverCardPrimitives from "@radix-ui/react-hover-card"

import { cn } from "cnfast"

interface TrackerBlockProps {
  key?: string | number
  color?: string
  style?: React.CSSProperties
  tooltip?: string | ReactNode
  tooltipClassname?: string
  hoverEffect?: boolean
  defaultBackgroundColor?: string
}

const Block = ({
  color,
  tooltip,
  tooltipClassname,
  style,
  defaultBackgroundColor,
  hoverEffect,
}: TrackerBlockProps) => {
  const [open, setOpen] = React.useState(false)
  return (
    <HoverCardPrimitives.Root
      open={tooltip ? open : false}
      onOpenChange={setOpen}
      openDelay={0}
      closeDelay={0}
      tremor-id="tremor-raw"
    >
      <HoverCardPrimitives.Trigger onClick={() => setOpen(tooltip ? true : true)} asChild>
        <div className="size-full overflow-hidden px-[0.5px] transition first:rounded-l-[4px] first:pl-0 last:rounded-r-[4px] last:pr-0 sm:px-px">
          <div
            className={cn(
              "size-full rounded-[1px]",
              color || defaultBackgroundColor,
              hoverEffect && "hover:opacity-50 transition-opacity duration-150 ease-in-out",
            )}
            style={style}
          />
        </div>
      </HoverCardPrimitives.Trigger>
      <HoverCardPrimitives.Portal>
        <HoverCardPrimitives.Content
          sideOffset={10}
          side="top"
          align="center"
          avoidCollisions
          className={cn(
            // base
            "w-auto rounded-md px-2 py-1 text-sm shadow-md",
            // text color
            "text-white dark:text-zinc-900",
            // background color
            "bg-zinc-900 dark:bg-zinc-50",
            tooltipClassname,
          )}
        >
          {tooltip}
        </HoverCardPrimitives.Content>
      </HoverCardPrimitives.Portal>
    </HoverCardPrimitives.Root>
  )
}

Block.displayName = "Block"

interface TrackerProps extends React.HTMLAttributes<HTMLDivElement> {
  data: TrackerBlockProps[]
  defaultBackgroundColor?: string
  hoverEffect?: boolean
}

const Tracker = React.forwardRef<HTMLDivElement, TrackerProps>(
  (
    {
      data = [],
      defaultBackgroundColor = "bg-gray-400 dark:bg-gray-400",
      className,
      hoverEffect,
      ...props
    },
    forwardedRef,
  ) => {
    return (
      <div
        ref={forwardedRef}
        className={cn("group flex h-8 w-full items-center", className)}
        {...props}
      >
        {data.map((props, index) => (
          <Block
            key={props.key ?? index}
            defaultBackgroundColor={defaultBackgroundColor}
            hoverEffect={hoverEffect}
            {...props}
          />
        ))}
      </div>
    )
  },
)

Tracker.displayName = "Tracker"

export { Tracker, type TrackerBlockProps }
