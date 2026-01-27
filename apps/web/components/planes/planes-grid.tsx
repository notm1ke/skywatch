import { FilterRow } from "./filter-row";
import { DataGrid } from "../ui/data-grid";
import { PlaneTypes } from "./plane-types";
import { ColumnDef } from "@tanstack/react-table";
import { RegistrationStatuses } from "./statuses";
import { useDataGrid } from "../ui/data-grid/hook";
import { usePlaneFilteringControls } from "./store";
import { RegistrationSearch } from "./filters/registration";
import { PlaneRegistration } from "@skywatch/gateway/schemas";

import {
	IdCardLanyard,
	ListChecks,
	Loader,
	Plane,
	Shapes,
	UserRound
} from "lucide-react";
import { motion } from "motion/react";
import { SlidingNumber } from "../ui/sliding-number";
import { AnimatedNumber } from "../ui/animated-number";

type PlanesRegistrationGridProps = {
	loading: boolean;
	registrations: PlaneRegistration[];
	count: number;
}

const columns: ColumnDef<PlaneRegistration>[] = [
	{
		id: "registration",
		accessorFn: row => (
			<span className="font-mono tracking-tight">
				<span className="text-muted-foreground">N</span>
				{row.n_number}
			</span>
		),
		header: "Registration",
		enableHiding: false,
		meta: {
			cell: {
				variant: "short-text",
				icon: IdCardLanyard
			},
		},
		minSize: 90,
	},
	{
		id: "aircraft",
		accessorFn: row => (
			<span>
				{row.aircraft.manufacturer} {row.aircraft.model}
				<br /><span className="text-xs text-muted-foreground">
					SN: {row.serial_number} / TX: {row.mode_s_hex}
				</span>
			</span>
		),
		header: "Aircraft",
		enableHiding: false,
		meta: {
			cell: {
				variant: "short-text",
				icon: Plane
			},
		},
		minSize: 180,
	},
	{
		id: "type",
		accessorKey: "aircraft_type",
		header: "Aircraft Type",
		enableHiding: false,
		meta: {
			cell: {
				variant: "select",
				icon: Shapes,
				options: PlaneTypes
			}
		},
		minSize: 120,
	},
	{
		id: "owner",
		accessorFn: row => {
			if (!row.owner_name) return (
				<span className="text-muted-foreground">Hidden</span>
			)
			
			return (
				<span>
					{row.owner_name}
					<br /><span className="text-xs text-muted-foreground">
						{row.owner_street ?? row.owner_street2}, {row.owner_city}, {row.owner_state}, {row.owner_country} 
					</span>
				</span>
			)
		},
		header: "Owner",
		enableHiding: false,
		meta: {
			cell: {
				variant: "short-text",
				icon: UserRound
			},
		},
		minSize: 180,
	},
	{
		id: "airworthy_date",
		accessorKey: "airworthy_date",
		header: "Airworthy Date",
		enableHiding: false,
		meta: {
			cell: {
				variant: "date",
				format: "MM/DD/YYYY"
			},
		},
		minSize: 90,
	},
	{
		id: "status",
		accessorKey: "status",
		header: "Status",
		enableHiding: false,
		meta: {
			cell: {
				variant: "select",
				icon: ListChecks,
				options: RegistrationStatuses
			}
		},
		minSize: 120,
	},
];

export const PlaneRegistrationsGrid: React.FC<PlanesRegistrationGridProps> = ({ loading, registrations, count }) => {
	const { registration, filter } = usePlaneFilteringControls();
	const { table, ...dataGridProps } = useDataGrid<PlaneRegistration>({
		columns,
		data: registrations,
		readOnly: true,
		getRowId: (row) => row.n_number,
		rowHeight: "tall",
		enableSearch: true,
		initialState: {
			columnPinning: {
				left: ["select"],
			},
		},
	});
	
	return (
		<div className="flex flex-col w-full h-full divide-y">
			<motion.div
				animate={{ height: 900 }}
				transition={{ duration: 0.25, ease: "easeInOut" }}
				className="overflow-hidden"
			>
				<DataGrid
					table={table}
					border={false}
					height={900}
					stretchColumns
					onRowClicked={row => {
						const stale = table.getSelectedRowModel().flatRows.map(r => r.original.n_number);
						const updated = {
							[row.original.n_number]: true,
							...stale.reduce((acc, id) => ({ ...acc, [id]: false }), {})
						};
						
						// clickRow(row.original)
						table.setRowSelection(updated);
					}}
					{...dataGridProps}
				/>
			</motion.div>
			<div className="hidden sm:flex flex-row justify-between h-10 items-center divide-x">
				<div className="flex flex-row h-full text-sm divide-x">
					<div className="flex flex-row gap-2 items-center px-4 font-mono tracking-tight text-sm h-full">
						{loading && <Loader className="size-4 animate-spin duration-200" />}
						{!loading && (
							<div className="w-32 flex flex-row gap-2 justify-center">
								<AnimatedNumber
									value={count}
									className="font-semibold text-sm"
									springOptions={{
										bounce: 0,
										duration: 350,
									}}
								/> <div>result{count === 1 ? "" : "s"}</div>
							</div>
						)}
					</div>
					<RegistrationSearch
						value={registration || ""}
						onChange={registration => filter({ registration })}
					/>
				</div>
				<FilterRow />
			</div>
		</div>
	)
}