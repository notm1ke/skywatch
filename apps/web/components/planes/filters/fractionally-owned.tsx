import { SelectOption } from "..";
import { orpc } from "~/lib/gateway";
import { useQuery } from "@tanstack/react-query";
import { usePlaneFilteringControls } from "../store";
import { FractionalOwnership } from "../fractional-ownership";
import { ComboboxButton, ComboboxSkeleton } from "~/components/ui/combobox";

export const FractionalOwnershipFilter = () => {
	const { fractionally_owned, filter } = usePlaneFilteringControls();
	const { data, isLoading } = useQuery(orpc.planes.filterOptions.queryOptions({
		input: { type: "fractionally_owned" },
	}));
	
	if (!data || isLoading) return (
		<ComboboxSkeleton label="Fractional" />
	);
	
	const items = data
		.map(item => FractionalOwnership.find(entry => entry.value.toLowerCase() === item.toLowerCase()))
		.filter(Boolean)
		.sort((a, b) => Boolean(a!.value) ? -1 : 1) as SelectOption[];
	
	if (!items) return (
		<ComboboxSkeleton label="Fractional" />
	);
	
	return (
		<ComboboxButton
			label="Fractional"
			placeholder="Filter ownership status.."
			items={items}
			value={fractionally_owned}
			onValueChange={value => filter({ fractionally_owned: value })}
		/>
	)
}