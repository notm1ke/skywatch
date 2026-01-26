import type * as React from "react";

import { cn } from "~/lib/utils";
import { Skeleton, SkeletonWithDelay } from "~/components/ui/skeleton";
import { Megaphone, Earth, TowerControl, List, Calendar, Baseline, type LucideIcon } from "lucide-react";

interface DivProps extends React.ComponentProps<"div"> {}

const SkeletonHeaders: Array<{ label: string; width: string; icon?: LucideIcon }> = [
	{
		label: "Column 1",
		width: "w-1/4",
		icon: Megaphone,
	},
	{
		label: "Column 2",
		width: "w-1/4",
		icon: Earth,
	},
	{
		label: "Column 3",
		width: "w-1/4",
		icon: TowerControl,
	},
	{
		label: "Column 4",
		width: "w-1/4",
		icon: List,
	},
	{
		label: "Column 5",
		width: "w-1/4",
		icon: Calendar,
	},
	{
		label: "Column 6",
		width: "w-1/2",
		icon: Baseline,
	},
];

interface DataGridSkeletonGridProps extends DivProps {
	headers?: Array<{ label: string; width: string; icon?: LucideIcon }>;
	rows?: number;
}

function DataGridSkeleton({ className, ...props }: DivProps) {
	return (
		<div
			data-slot="grid-skeleton"
			className={cn(
				"flex h-[calc(100dvh-(--spacing(16)))] w-full flex-col gap-4 has-[>[data-slot=grid-skeleton-toolbar]]:h-[calc(100dvh-(--spacing(20)))]",
				className,
			)}
			{...props}
		/>
	);
}

interface DataGridSkeletonToolbarProps extends DivProps {
	align?: "start" | "center" | "end";
	actionCount?: number;
}

function DataGridSkeletonToolbar({
	align = "end",
	actionCount = 4,
	className,
	...props
}: DataGridSkeletonToolbarProps) {
	return (
		<div
			data-slot="grid-skeleton-toolbar"
			className={cn(
				"flex items-center gap-2",
				{
					"justify-start": align === "start",
					"justify-center": align === "center",
					"justify-end": align === "end",
				},
				className,
			)}
			{...props}
		>
			{Array.from({ length: actionCount }).map((_, i) => (
				<Skeleton key={i} className="h-7 w-20 shrink-0" />
			))}
		</div>
	);
}

function DataGridSkeletonGrid({ className, headers = SkeletonHeaders, rows = 10, ...props }: DataGridSkeletonGridProps) {
	return (
		<div
			data-slot="grid-skeleton-grid"
			className={cn("flex-1", className)}
			{...props}
		>
			<div className="flex flex-col items-center justify-center w-full h-full divide-y-2 space-y-0">
				<div className="w-full flex sm:hidden flex-row divide-x-2 [&>div]:rounded-none not-first:border-t text-sm overflow-x-scroll sm:overflow-x-auto">
					{headers.slice(0, 3).map(header => (
						<div key={header.label} className={cn("flex items-center gap-1.5 h-9 cursor-not-allowed [&>svg]:size-4 w-1/3")}>
							{header.icon && <header.icon className="size-3.5 shrink-0 text-muted-foreground ml-2" />}
							<span className="truncate">{header.label}</span>
						</div>
					))}
				</div>
				
				<div className="hidden w-full sm:flex flex-row divide-x-2 [&>div]:rounded-none not-first:border-t text-sm overflow-x-scroll sm:overflow-x-auto">
					{headers.map(header => (
						<div key={header.label} className={cn("flex items-center gap-1.5 h-9 cursor-not-allowed [&>svg]:size-4", header.width)}>
							{header.icon && <header.icon className="size-3.5 shrink-0 text-muted-foreground ml-2" />}
							<span className="truncate">{header.label}</span>
						</div>
					))}
				</div>
				
				{Array.from({ length: rows }).map((_, i) => (
					<div key={`data-grid-skeleton-${i}`} className="w-full flex sm:hidden flex-row divide-x-2 [&>div]:rounded-none not-first:border-t overflow-x-scroll sm:overflow-x-auto">
						<SkeletonWithDelay className="w-40 h-14" delay={i * 50} />
						<SkeletonWithDelay className="w-40 h-14" delay={i * 50} />
						<SkeletonWithDelay className="w-40 h-14" delay={i * 50} />
					</div>
				))}
				
				{Array.from({ length: rows }).map((_, i) => (
					<div key={`data-grid-skeleton-${i}`} className="w-full hidden sm:flex flex-row divide-x-2 [&>div]:rounded-none not-first:border-t overflow-x-scroll sm:overflow-x-auto">
						{headers.map((header, j) => (
							<SkeletonWithDelay key={j} className={cn(header.width, "h-14")} delay={i * 50} />
						))}
					</div>
				))}
			</div>
		</div>
	);
}

export { DataGridSkeleton, DataGridSkeletonGrid, DataGridSkeletonToolbar };