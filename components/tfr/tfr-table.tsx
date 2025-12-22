"use client";

import { cn } from "~/lib/utils";
import { Tfr } from "~/lib/aviation/tfr";
import { TfrInfoPanel } from "./info-panel";
import { useTfrInteractivity } from "./store";
import { UsStateAbbreviations } from "~/lib/geo";
import { DataGrid } from "~/components/ui/data-grid";
import type { ColumnDef } from "@tanstack/react-table";
import { useDataGrid } from "~/components/ui/data-grid/hook";

import {
	Crown,
	Drone,
	Earth,
	Flag,
	LandPlot,
	Lock,
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
