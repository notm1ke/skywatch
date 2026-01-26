import { Button } from "../ui/button";
import { ChevronDown } from "lucide-react";
import { PropsWithChildren, ReactNode } from "react";
import { RegistrationStatusFilter } from "./filters/status";
import { PropulsionTypeFilter } from "./filters/propulsion";
import { ManufacturerFilter } from "./filters/manufacturer";
import { AirplaneTypeFilter } from "./filters/airplane-type";
import { AirplaneModelFilter } from "./filters/airplane-model";
import { OwnerFilter } from "./filters/owner";

const Filters: Record<string, React.FC<PropsWithChildren> | ReactNode> = {
	"Status": RegistrationStatusFilter,
	"Manufacturer": ManufacturerFilter,
	"Aircraft": AirplaneModelFilter,
	"Type": AirplaneTypeFilter,
	"Propulsion": PropulsionTypeFilter,
	"Owner": OwnerFilter,
	"Fractionally Owned": () => <></>
}

export const FilterRow = () => (
	<div className="flex flex-row space-x-2 items-center px-2">
		{Object.entries(Filters).map(([type, Component]) => (
			<Component key={type}>
				<Button key={type} variant="secondary" size="xs">
					{type} <ChevronDown className="size-3" />
				</Button>
			</Component>
		))}
	</div>
)