"use client";

import { cn } from "~/lib/utils";
import { Tfr } from "~/lib/schemas";
import { TfrInfoPanel } from "./info-panel";
import { useTfrInteractivity } from "./store";
import { UsStateAbbreviations } from "~/lib/geo";
import { SkeletonWithDelay } from "../ui/skeleton";
import { DataGrid } from "~/components/ui/data-grid";
import type { ColumnDef } from "@tanstack/react-table";
import { useDataGrid } from "~/components/ui/data-grid/hook";

import {
	Baseline,
	Calendar,
	Crown,
	Drone,
	Earth,
	Flag,
	LandPlot,
	List,
	Lock,
	LucideIcon,
	Megaphone,
	Rocket,
	TowerControl
} from "lucide-react";

const columns: ColumnDef<Tfr>[] = [
	{
		id: "notam",
		accessorKey: "notam_id",
		header: "NOTAM",
		enableHiding: false,
		meta: {
			cell: {
				variant: "short-text",
				icon: Megaphone
			},
		},
		minSize: 180,
	},
	{
		id: "region",
		accessorKey: "state",
		header: "Region",
		enableHiding: false,
		meta: {
			cell: {
				variant: "select",
				icon: Earth,
				options: Object
					.entries(UsStateAbbreviations)
					.map(([key, value]) => ({
						label: value,
						value: key,
					}))
			}
		},
		minSize: 120,
	},
	{
		id: "facility",
		accessorKey: "facility",
		header: "ARTCC",
		enableHiding: false,
		meta: {
			cell: {
				variant: "short-text",
				icon: TowerControl
			},
		},
		minSize: 150,
	},
	{
		id: "type",
		accessorKey: "type",
		header: "Type",
		enableHiding: false,
		meta: {
			cell: {
				variant: "select",
				options: [
					{
						label: "Air Show / Sports",
						value: "AIR SHOWS/SPORTS",
						icon: LandPlot,
						color: "green"
					},
					{
						label: "Hazards",
						value: "HAZARDS",
						icon: Flag,
						color: "red"
					},
					{
						label: "Security",
						value: "SECURITY",
						icon: Lock,
						color: "orange"
					},
					{
						label: "Space Operations",
						value: "SPACE OPERATIONS",
						icon: Rocket,
						color: "blue"
					},
					{
						label: "Special",
						value: "SPECIAL",
						icon: Megaphone,
						color: "purple"
					},
					{
						label: "Drone Show",
						value: "UAS PUBLIC GATHERING",
						icon: Drone,
						color: "purple"
					},
					{
						label: "VIP Movement",
						value: "VIP",
						icon: Crown,
						color: "yellow"
					},
				]
			},
		},
		minSize: 120,
	},
	{
		id: "modified_date",
		accessorKey: "mod_date",
		header: "Last Modified",
		enableHiding: false,
		meta: {
			cell: {
				variant: "date",
				format: "MM/DD/YYYY h:mm A [UTC]"
			},
		},
		minSize: 200,
	},
	{
		id: "description",
		accessorKey: "description",
		header: "Description",
		enableHiding: false,
		meta: {
			cell: {
				variant: "long-text",
			},
		},
		minSize: 400,
		maxSize: 400
	},
];

const SkeletonHeaders: Array<{ label: string, width: string, icon: LucideIcon }> = [
	{
		label: "NOTAM",
		width: "w-1/4",
		icon: Megaphone
	},
	{
		label: "Region",
		width: "w-1/4",
		icon: Earth
	},
	{
		label: "ARTCC",
		width: "w-1/4",
		icon: TowerControl
	},
	{
		label: "Type",
		width: "w-1/4",
		icon: List
	},
	{
		label: "Last Modified",
		width: "w-1/4",
		icon: Calendar
	},
	{
		label: "Description",
		width: "w-1/2",
		icon: Baseline
	}
]

export const TfrTableSkeletonLoader = () => (
	<div className="flex flex-col items-center justify-center w-full h-full divide-y-2 space-y-0 border-t-2">
		<div className="w-full flex sm:hidden flex-row divide-x-2 [&>div]:rounded-none not-first:border-t text-sm overflow-x-scroll sm:overflow-x-auto">
			{SkeletonHeaders.slice(0, 3).map(header => (
				<div key={header.label} className={cn("flex items-center gap-1.5 h-9 cursor-not-allowed [&>svg]:size-4 w-1/3")}>
					<header.icon className="size-3.5 shrink-0 text-muted-foreground ml-2" />
					<span className="truncate">{header.label}</span>
				</div>
			))}
		</div>
		
		<div className="hidden w-full sm:flex flex-row divide-x-2 [&>div]:rounded-none not-first:border-t text-sm overflow-x-scroll sm:overflow-x-auto">
			{SkeletonHeaders.map(header => (
				<div key={header.label} className={cn("flex items-center gap-1.5 h-9 cursor-not-allowed [&>svg]:size-4", header.width)}>
					<header.icon className="size-3.5 shrink-0 text-muted-foreground ml-2" />
					<span className="truncate">{header.label}</span>
				</div>
			))}
		</div>
		
		{Array.from({ length: 10 }).map((_, i) => (
			<div key={`tfr-table-skeleton-${i}`} className="w-full flex sm:hidden flex-row divide-x-2 [&>div]:rounded-none not-first:border-t overflow-x-scroll sm:overflow-x-auto">
				<SkeletonWithDelay className="w-40 h-14" delay={i * 50} />
				<SkeletonWithDelay className="w-40 h-14" delay={i * 50} />
				<SkeletonWithDelay className="w-40 h-14" delay={i * 50} />
			</div>
		))}

		{Array.from({ length: 10 }).map((_, i) => (
			<div key={`tfr-table-skeleton-${i}`} className="w-full hidden sm:flex flex-row divide-x-2 [&>div]:rounded-none not-first:border-t overflow-x-scroll sm:overflow-x-auto">
				<SkeletonWithDelay className="w-1/4 h-14" delay={i * 50} />
				<SkeletonWithDelay className="w-1/4 h-14" delay={i * 50} />
				<SkeletonWithDelay className="w-1/4 h-14" delay={i * 50} />
				<SkeletonWithDelay className="w-1/4 h-14" delay={i * 50} />
				<SkeletonWithDelay className="w-1/4 h-14" delay={i * 50} />
				<SkeletonWithDelay className="w-1/2 h-14" delay={i * 50} />
			</div>
		))}
	</div>
)

export const TfrTable: React.FC<{ tfrs: Tfr[] }> = ({ tfrs }) => {
	const { active, clickRow } = useTfrInteractivity();
	const { table, ...dataGridProps } = useDataGrid<Tfr>({
		columns,
		data: tfrs,
		readOnly: true,
		getRowId: (row) => row.notam_id,
		rowHeight: "medium",
		enableSearch: true,
		initialState: {
			columnPinning: {
				left: ["select"],
			},
		},
	});
	
	return (
		<div className="flex w-full h-full">
			<div className="flex-1 min-w-0 transition-all duration-300 ease-in-out">
				<DataGrid
					table={table}
					stretchColumns
					onRowClicked={row => {
						const stale = table.getSelectedRowModel().flatRows.map(r => r.original.notam_id);
						const updated = {
							[row.original.notam_id]: true,
							...stale.reduce((acc, id) => ({ ...acc, [id]: false }), {})
						};
						
						clickRow(row.original)
						table.setRowSelection(updated);
					}}
					{...dataGridProps}
				/>
			</div>
			<div className={cn("shrink-0 transition-all duration-300 ease-in-out overflow-hidden", active ? "w-full sm:w-[365px]" : "w-0")}>
				<div className="w-full border-y border-r border-border overflow-hidden">
					{active && <TfrInfoPanel tfr={active} />}
				</div>
			</div>
		</div>
	);
}
