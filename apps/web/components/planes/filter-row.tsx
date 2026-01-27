import { OwnerFilter } from "./filters/owner";
import { RegistrationStatusFilter } from "./filters/status";
import { PropulsionTypeFilter } from "./filters/propulsion";
import { ManufacturerFilter } from "./filters/manufacturer";
import { AirplaneTypeFilter } from "./filters/airplane-type";
import { AirplaneModelFilter } from "./filters/airplane-model";
import { FractionalOwnershipFilter } from "./filters/fractionally-owned";

const Filters: React.FC[] = [
	RegistrationStatusFilter,
	ManufacturerFilter,
	AirplaneModelFilter,
	AirplaneTypeFilter,
	PropulsionTypeFilter,
	OwnerFilter,
	FractionalOwnershipFilter
]

export const FilterRow = () => (
	<div className="flex flex-row space-x-2 items-center px-2">
		{Object.entries(Filters).map(([type, Component]) => (
			<Component key={type} />
		))}
	</div>
)