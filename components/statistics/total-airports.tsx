import { Diamond } from "lucide-react";
import { Skeleton } from "../ui/skeleton";
import { useAirports } from "../airport-provider";

export const TotalAirportsSkeleton = () => {
	return (
		<div className="flex items-center gap-1 w-full md:w-fit md:justify-start mt-2 font-mono space-x-1">
			<span aria-hidden="true" className="text-zinc-900 dark:text-zinc-100">
				<Diamond className="size-3 fill-current" />
			</span>
			<div className="flex items-center space-x-1">
				<span className="font-medium text-[16px] text-zinc-900 dark:text-zinc-100">
					<Skeleton className="w-[5ch] h-5" />
				</span>
				<span className="font-medium text-[16px] text-muted-foreground tracking-tight ml-1">airports tracked</span>
			</div>
		</div>
	)
}

export const TotalAirports = () => {
	const { airports, loading } = useAirports();
	
	return (
		<div className="flex items-center gap-1 w-full md:w-fit md:justify-start mt-2 font-mono space-x-1">
			<span aria-hidden="true" className="text-zinc-900 dark:text-zinc-100">
				<Diamond className="size-3 fill-current" />
			</span>
			<div className="flex items-center space-x-1">
				<span className="font-medium text-[16px] text-zinc-900 dark:text-zinc-100">
					{loading && <></>}
					{!loading && airports.length}
				</span>
				<span className="font-medium text-[16px] text-muted-foreground tracking-tight ml-1">airports tracked</span>
			</div>
		</div>
	)
}