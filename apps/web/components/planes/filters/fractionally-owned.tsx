import { SelectOption } from "..";
import { orpc } from "~/lib/gateway";
import { useQuery } from "@tanstack/react-query";
import { usePlaneFilteringControls } from "../store";
import { ComboboxButton } from "~/components/ui/combobox";
import { FractionalOwnership } from "../fractional-ownership";

export const FractionalOwnershipFilter = () => {
	const { fractionally_owned, filter } = usePlaneFilteringControls();
	const { data, isLoading } = useQuery(orpc.planes.filterOptions.queryOptions({
		input: { type: "fractionally_owned" },
	}));
	
	if (!data || isLoading) return null;
	const items = data
		.map(item => FractionalOwnership.find(entry => entry.value.toLowerCase() === item.toLowerCase()))
		.filter(Boolean)
		.sort((a, b) => Boolean(a!.value) ? -1 : 1) as SelectOption[];
	
	if (!items) return null;
	
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