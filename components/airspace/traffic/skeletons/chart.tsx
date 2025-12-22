import { Skeleton } from "~/components/ui/skeleton";

export const TrafficChartSkeleton = () => (
	<div className="divide-y-2">
		<div className="flex flex-row pr-3 py-2.5 justify-between border-b">
			<div className="flex flex-row items-center gap-1 pl-1">
				<Skeleton className="h-5 w-40" />
			</div>
			<div className="flex text-sm items-center rounded-sm font-mono tabular-nums">
				<Skeleton className="h-6 w-14" />
			</div>
		</div>
		<div className="p-2 mt-2">
			<div className="mb-3">
				<div className="flex">
					<div className="w-6 flex flex-col items-center pr-2 py-2">
						<div className="flex-1 flex flex-col justify-between w-full">
							{Array(6).fill(0).map((_, i) => (
								<Skeleton key={i} className="w-full h-1 rounded" />
							))}
						</div>
					</div>

					<div className="flex-1 pr-2">
						<Skeleton className="w-full h-48 rounded-md" />
					</div>
				</div>
			</div>
			<div className="flex justify-between items-end">
				<div className="flex-1 pl-6">
					<Skeleton className="w-9 h-2 rounded" />
				</div>
				<div className="flex gap-2 pr-3 items-center">
					<Skeleton className="w-9 h-2 rounded" />
				</div>
			</div>
		</div>
	</div>
);
