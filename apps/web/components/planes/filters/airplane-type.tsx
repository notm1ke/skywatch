import { SelectOption } from "..";
import { orpc } from "~/lib/gateway";
import { PlaneTypes } from "../plane-types";
import { useQuery } from "@tanstack/react-query";
import { usePlaneFilteringControls } from "../store";
import { ComboboxButton } from "~/components/ui/combobox";

export const AirplaneTypeFilter = () => {
	const { aircraft_type, filter } = usePlaneFilteringControls();
	const { data, isLoading } = useQuery(orpc.planes.filterOptions.queryOptions({
		input: { type: "aircraft_type" },
	}));
	
	if (!data || isLoading) return null;
	const items = data
		.map(item => PlaneTypes.find(entry => entry.value.toLowerCase() === item.toLowerCase()))
		.filter(Boolean)
		.sort((a, b) => a!.label.localeCompare(b!.label)) as SelectOption[];
	
	if (!items) return null;
	
	return (
		<ComboboxButton
			multiple
			label="Type"
			placeholder="Filter aircraft type.."
			items={items}
			value={aircraft_type}
			onValueChange={value => filter({ aircraft_type: value })}
		/>
	)
}