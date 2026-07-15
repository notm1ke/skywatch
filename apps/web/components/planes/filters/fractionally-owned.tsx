import { SelectOption } from "..";
import { orpc } from "~/lib/gateway";
import { useQuery } from "@tanstack/react-query";
import { usePlaneFilteringControls } from "../store";
import { FractionalOwnership } from "../fractional-ownership";
import { FilterOptionList } from "./option-list";
import { ComboboxButton, ComboboxSkeleton } from "~/components/ui/combobox";

export const FractionalOwnershipFilter = ({ mode = "button" }: { mode?: "button" | "list" }) => {
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

	if (mode === "list") return (
		<FilterOptionList
			items={items}
			value={fractionally_owned}
			onValueChange={value => filter({ fractionally_owned: value })}
		/>
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