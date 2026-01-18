import { DataGrid } from "../ui/data-grid";
import { PlaneTypes } from "./plane-types";
import { RegistrationStatuses } from "./statuses";
import { ColumnDef } from "@tanstack/react-table";
import { useDataGrid } from "../ui/data-grid/hook";
import { PlaneRegistration } from "@skywatch/gateway/schemas";
import { IdCardLanyard, ListChecks, Plane, Shapes, UserRound } from "lucide-react";

type PlanesRegistrationGridProps = {
	registrations: PlaneRegistration[]
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
	// {
	// 	id: "engine",
	// 	accessorFn: row => {
	// 		if (!row.engine || isNaN(row.aircraft.engines)) return (
	// 			<span className="text-muted-foreground">Unknown</span>
	// 		)
			
	// 		if (row.aircraft.engines === 0) return (
	// 			<span className="text-muted-foreground">Unpowered</span>
	// 		)
			
	// 		return (
	// 			<span>
	// 				<span className="text-muted-foreground">{row.aircraft.engines}x</span> {row.engine?.manufacturer} {row.engine?.model}
	// 			</span>
	// 		);
	// 	},
	// 	header: "Engines",
	// 	enableHiding: false,
	// 	meta: {
	// 		cell: {
	// 			variant: "short-text",
	// 			icon: Shell
	// 		},
	// 	},
	// 	minSize: 180,
	// },
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
	// {
	// 	id: "region",
	// 	accessorKey: "state",
	// 	header: "Region",
	// 	enableHiding: false,
	// 	meta: {
	// 		cell: {
	// 			variant: "select",
	// 			icon: Earth,
	// 			options: Object
	// 				.entries(UsStateAbbreviations)
	// 				.map(([key, value]) => ({
	// 					label: value,
	// 					value: key,
	// 				}))
	// 		}
	// 	},
	// 	minSize: 120,
	// },
	// {
	// 	id: "facility",
	// 	accessorKey: "facility",
	// 	header: "ARTCC",
	// 	enableHiding: false,
	// 	meta: {
	// 		cell: {
	// 			variant: "short-text",
	// 			icon: TowerControl
	// 		},
	// 	},
	// 	minSize: 150,
	// },
	// {
	// 	id: "modified_date",
	// 	accessorKey: "mod_date",
	// 	header: "Last Modified",
	// 	enableHiding: false,
	// 	meta: {
	// 		cell: {
	// 			variant: "date",
	// 			format: "MM/DD/YYYY h:mm A [UTC]"
	// 		},
	// 	},
	// 	minSize: 200,
	// },
	// {
	// 	id: "description",
	// 	accessorKey: "description",
	// 	header: "Description",
	// 	enableHiding: false,
	// 	meta: {
	// 		cell: {
	// 			variant: "long-text",
	// 		},
	// 	},
	// 	minSize: 400,
	// 	maxSize: 400
	// },
];

export const PlaneRegistrationsGrid: React.FC<PlanesRegistrationGridProps> = ({ registrations }) => {
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
		<div className="flex flex-col w-full h-full divide-y-2">
			<div className="flex flex-row justify-between h-12 divide-x-2">
				{/* search */}
				<div className="w-1/3">
					
				</div>
				
				{/* filters */}
				
				{/* columns */}
			</div>
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
		</div>
	)
}