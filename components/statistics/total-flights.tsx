import { Skeleton } from "../ui/skeleton";
import { AnimatedNumber } from "../ui/animated-number";

export const TotalFlightsSkeleton = () => (
	<div className="space-y-2">
		<h2 className="my-0.5 font-mono font-medium text-sm tracking-tight uppercase text-zinc-700 dark:text-zinc-300">
			Flights observed
		</h2>
		
		<Skeleton className="h-10 w-24" />
	</div>
)

export const TotalFlights: React.FC<{ total: number }> = ({ total }) => {
	return (
		<div className="space-y-2">
			<h2 className="my-0.5 font-mono font-medium text-sm tracking-tight uppercase text-zinc-700 dark:text-zinc-300">
				Flights observed
			</h2>
			
			<AnimatedNumber
				value={total}
				className="text-xl md:text-2xl tracking-normal font-mono"
				springOptions={{
					bounce: 0,
					duration: 2000,
				}}
			/>
		</div>
	)
}