import { Skeleton } from "~/components/ui/skeleton";

export const AirportsPageSkeleton = () => (
	<div className="flex h-[calc(100svh-4rem)] overflow-hidden">
		<aside className="flex w-52 shrink-0 flex-col border-r">
			<div className="border-b p-2">
				<Skeleton className="h-7 w-full" />
			</div>
			<div className="border-b px-3 py-2">
				<Skeleton className="h-4 w-16" />
			</div>
			{Array.from({ length: 4 }).map((_, i) => (
				<div key={i} className="border-b px-3 py-2 flex flex-col gap-1.5">
					<Skeleton className="h-3 w-20" />
					<Skeleton className="h-3 w-full" />
					<Skeleton className="h-3 w-full" />
					<Skeleton className="h-3 w-3/4" />
				</div>
			))}
		</aside>
		<div className="flex flex-1 flex-col overflow-hidden">
			<div className="border-b px-4 py-2">
				<Skeleton className="h-4 w-28" />
			</div>
			{Array.from({ length: 16 }).map((_, i) => (
				<div key={i} className="flex items-center gap-3 border-b px-4 py-2.5">
					<Skeleton className="h-4 w-10" />
					<Skeleton className="h-4 flex-1" />
					<Skeleton className="h-4 w-6" />
					<Skeleton className="h-4 w-16" />
					<Skeleton className="h-4 w-12" />
				</div>
			))}
		</div>
	</div>
);
