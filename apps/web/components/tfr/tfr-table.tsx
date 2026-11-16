"use client";

import { cn } from "cnfast";
import { Tfr } from "~/lib/schemas";
import { useTfrControls } from "./store";
import { TFR_TYPES } from "./types";
import { UsStateAbbreviations } from "~/lib/geo";
import { SkeletonWithDelay } from "../ui/skeleton";
import { DataGrid } from "~/components/ui/data-grid";
import type { ColumnDef, Row } from "@tanstack/react-table";
import { useDataGrid } from "~/components/ui/data-grid/hook";
import { useCallback, useEffect, useRef, useState } from "react";

import {
	Baseline,
	Calendar,
	Earth,
	List,
	LucideIcon,
	Megaphone,
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
				// the same colors as the map's shapes and the bar's chips
				options: TFR_TYPES.map(type => ({
					label: type.label,
					value: type.value,
					icon: type.icon,
					color: type.badge
				}))
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

// the grid's rows are "medium": see getRowHeightValue
const ROW_HEIGHT = 56;

/**
 * The TFRs as a table, in step with the map: hovering a row picks its shape out on the map and the other way round, a
 * click on either opens the TFR, and a TFR opened on the map is scrolled into view here.
 */
export const TfrTable: React.FC<{ tfrs: Tfr[] }> = ({ tfrs }) => {
	const selectedId = useTfrControls(state => state.selectedId);
	const hoverId = useTfrControls(state => state.hoverId);

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

	// The grid scrolls inside a box with a maximum height in pixels, so it's given the room it has.
	const roomRef = useRef<HTMLDivElement>(null);
	const [room, setRoom] = useState(320);

	useEffect(() => {
		const element = roomRef.current;
		if (!element) return;

		const observer = new ResizeObserver(([entry]) => setRoom(Math.floor(entry.contentRect.height)));
		observer.observe(element);
		return () => observer.disconnect();
	}, []);

	// A TFR opened on the map: bring its row into view, if it's in the table. The rows are virtual, so most of them
	// aren't on the page to scroll to: work out where this one is.
	const { dataGridRef, headerRef } = dataGridProps;
	useEffect(() => {
		const grid = dataGridRef.current;
		if (!selectedId || !grid) return;

		const position = table.getRowModel().rows.findIndex(row => row.id === selectedId);
		if (position < 0) return;

		const header = headerRef.current?.offsetHeight ?? 0;
		const top = position * ROW_HEIGHT;
		const bottom = top + ROW_HEIGHT;
		const visibleHeight = grid.clientHeight - header;

		if (top < grid.scrollTop) grid.scrollTo({ top, behavior: "smooth" });
		else if (bottom > grid.scrollTop + visibleHeight) grid.scrollTo({ top: bottom - visibleHeight, behavior: "smooth" });
	}, [selectedId, table, dataGridRef, headerRef]);

	const getRowProps = useCallback((row: Row<Tfr>) => {
		const id = row.original.notam_id;
		if (id === selectedId) return { className: "bg-amber-500/10" };
		if (id === hoverId) return { className: "bg-accent/50" };
	}, [selectedId, hoverId]);

	return (
		<div ref={roomRef} className="h-full min-h-0 w-full">
			{tfrs.length === 0
				? (
					<div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
						No TFRs match. Zoom out, or turn a type back on.
					</div>
				)
				: (
					<DataGrid
						table={table}
						stretchColumns
						border={false}
						height={room}
						getRowProps={getRowProps}
						onRowHoverChange={(row, hovered) => {
							const { hoverId, setHover } = useTfrControls.getState();
							if (hovered) return setHover(row.original.notam_id);
							// moving from one row to the next fires this row's leave after the next one's enter
							if (hoverId === row.original.notam_id) setHover(null);
						}}
						onRowClicked={row => useTfrControls.getState().select(row.original.notam_id, true)}
						{...dataGridProps}
					/>
				)}
		</div>
	);
}
