import { SelectOption } from "..";
import { orpc } from "~/lib/gateway";
import { PropulsionTypes } from "../propulsion";
import { useQuery } from "@tanstack/react-query";
import { usePlaneFilteringControls } from "../store";
import { ComboboxButton, ComboboxSkeleton } from "~/components/ui/combobox";

export const PropulsionTypeFilter = () => {
	const { engine_type, filter } = usePlaneFilteringControls();
	const { data, isLoading } = useQuery(orpc.planes.filterOptions.queryOptions({
		input: { type: "engine_type" },
	}));
	
	if (!data || isLoading) return (
		<ComboboxSkeleton label="Propulsion" />
	);
	
	const items = data
		.map(item => PropulsionTypes.find(entry => entry.value.toLowerCase() === item.toLowerCase()))
		.filter(Boolean)
		.sort((a, b) => a!.label.localeCompare(b!.label)) as SelectOption[];
	
	if (!items) return (
		<ComboboxSkeleton label="Propulsion" />
	);
	
	return (
		<ComboboxButton
			multiple
			label="Propulsion"
			placeholder="Filter propulsion type.."
			items={items}
			value={engine_type}
			onValueChange={value => filter({ engine_type: value })}
		/>
	)
}