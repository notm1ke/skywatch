import { Skeleton } from "../ui/skeleton";
import { DataGridSkeletonGrid } from "../ui/data-grid/skeleton";

import {
	Calendar,
	IdCardLanyard,
	ListChecks,
	LucideIcon,
	Plane,
	Shapes,
	UserRound
} from "lucide-react";

const planeHeaders: Array<{ label: string; width: string; icon?: LucideIcon }> = [
	{
		label: "Registration",
		width: "w-1/6",
		icon: IdCardLanyard
	},
	{
		label: "Aircraft",
		width: "w-1/6",
		icon: Plane
	},
	{
		label: "Aircraft Type",
		width: "w-1/6",
		icon: Shapes
	},
	{
		label: "Owner",
		width: "w-1/6",
		icon: UserRound
	},
	{
		label: "Airworthy Date",
		width: "w-1/6",
		icon: Calendar
	},
	{
		label: "Status",
		width: "w-1/6",
		icon: ListChecks
	}
];

const FilterRowSkeleton = () => (
	<div className="flex h-full divide-x">
		{["w-14", "w-24", "w-16", "w-10", "w-20", "w-14", "w-16"].map((width, index) => (
			<div key={index} className="flex h-full items-center px-3">
				<Skeleton className={`h-4 ${width}`} />
			</div>
		))}
	</div>
);

export const PlaneRegistrationsGridSkeleton = () => (
	<div className="flex flex-col w-full h-full divide-y-2">
		<DataGridSkeletonGrid
			headers={planeHeaders}
			rows={15}
		/>
		
		<div className="flex flex-row justify-between h-10 items-center divide-x">
			<div className="flex flex-row h-full text-sm divide-x">
				<div className="flex flex-row gap-2 items-center px-4 font-mono tracking-tight text-sm h-full">
					<Skeleton className="h-4 w-8" />
					<Skeleton className="h-4 w-20" />
				</div>
				<div className="flex items-center relative font-mono tracking-tight text-sm w-72 px-2 h-full grow">
					<Skeleton className="w-full h-5" />
				</div>
			</div>
			<FilterRowSkeleton />
		</div>
	</div>
)