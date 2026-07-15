import { OwnerFilter } from "./filters/owner";
import { RegistrationStatusFilter } from "./filters/status";
import { PropulsionTypeFilter } from "./filters/propulsion";
import { ManufacturerFilter } from "./filters/manufacturer";
import { AirplaneTypeFilter } from "./filters/airplane-type";
import { AirplaneModelFilter } from "./filters/airplane-model";
import { FractionalOwnershipFilter } from "./filters/fractionally-owned";

type PlaneFilterMode = { mode?: "button" | "list" };

export const PLANE_FILTER_DEFS: { id: string; label: string; Component: React.FC<PlaneFilterMode> }[] = [
	{ id: "status", label: "Status", Component: RegistrationStatusFilter },
	{ id: "manufacturer", label: "Manufacturer", Component: ManufacturerFilter },
	{ id: "model", label: "Aircraft", Component: AirplaneModelFilter },
	{ id: "aircraft_type", label: "Type", Component: AirplaneTypeFilter },
	{ id: "engine_type", label: "Propulsion", Component: PropulsionTypeFilter },
	{ id: "owner_name", label: "Owner", Component: OwnerFilter },
	{ id: "fractionally_owned", label: "Fractional", Component: FractionalOwnershipFilter },
]

export const FilterRow = () => (
	<div className="hidden sm:flex flex-row space-x-2 items-center px-2">
		{PLANE_FILTER_DEFS.map(({ id, Component }) => (
			<Component key={id} />
		))}
	</div>
)