import { Skeleton } from "~/components/ui/skeleton"

export const TrafficTreemapSkeleton = () => {
	return (
		<div className="divide-y-2">
			<div className="flex flex-row pr-3 py-2.5 justify-between border-b">
				<div className="flex flex-row items-center gap-1 pl-1">
					<Skeleton className="h-5 w-40" />
				</div>
				<div className="flex text-sm items-center rounded-sm font-mono tabular-nums">
					<Skeleton className="h-6 w-14" />
				</div>
			</div>
			<div className="h-[250px] w-full">
				<svg viewBox="0 0 800 250" className="w-full h-full" preserveAspectRatio="none">
					<rect x="0" y="0" width="300" height="250" className="fill-accent animate-pulse stroke-zinc-700 stroke-[1.5px]" />
					<rect x="300" y="0" width="250" height="90" className="fill-accent animate-pulse stroke-zinc-700 stroke-[1.5px]" />
					<rect x="550" y="0" width="250" height="90" className="fill-accent animate-pulse stroke-zinc-700 stroke-[1.5px]" />
					<rect x="300" y="90" width="125" height="80" className="fill-accent animate-pulse stroke-zinc-700 stroke-[1.5px]" />
					<rect x="425" y="90" width="175" height="80" className="fill-accent animate-pulse stroke-zinc-700 stroke-[1.5px]" />
					<rect x="600" y="90" width="200" height="80" className="fill-accent animate-pulse stroke-zinc-700 stroke-[1.5px]" />
					<rect x="300" y="170" width="100" height="80" className="fill-accent animate-pulse stroke-zinc-700 stroke-[1.5px]" />
					<rect x="400" y="170" width="100" height="40" className="fill-accent animate-pulse stroke-zinc-700 stroke-[1.5px]" />
					<rect x="400" y="210" width="100" height="40" className="fill-accent animate-pulse stroke-zinc-700 stroke-[1.5px]" />
					<rect x="500" y="170" width="150" height="40" className="fill-accent animate-pulse stroke-zinc-700 stroke-[1.5px]" />
					<rect x="500" y="210" width="75" height="40" className="fill-accent animate-pulse stroke-zinc-700 stroke-[1.5px]" />
					<rect x="575" y="170" width="225" height="80" className="fill-accent animate-pulse stroke-zinc-700 stroke-[1.5px]" />
				</svg>
			</div>
		</div>
	)
}