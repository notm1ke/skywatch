import { SelectOption } from "..";
import { orpc } from "~/lib/gateway";
import { PlaneTypes } from "../plane-types";
import { useQuery } from "@tanstack/react-query";
import { usePlaneFilteringControls } from "../store";
import { FilterOptionList } from "./option-list";
import { ComboboxButton, ComboboxSkeleton } from "~/components/ui/combobox";

export const AirplaneTypeFilter = ({ mode = "button" }: { mode?: "button" | "list" }) => {
	const { aircraft_type, filter } = usePlaneFilteringControls();
	const { data, isLoading } = useQuery(orpc.planes.filterOptions.queryOptions({
		input: { type: "aircraft_type" },
	}));

	if (!data || isLoading) return (
		<ComboboxSkeleton label="Type" />
	);

	const items = data
		.map(item => PlaneTypes.find(entry => entry.value.toLowerCase() === item.toLowerCase()))
		.filter(Boolean)
		.sort((a, b) => a!.label.localeCompare(b!.label)) as SelectOption[];

	if (!items) return (
		<ComboboxSkeleton label="Type" />
	);

	if (mode === "list") return (
		<FilterOptionList
			multiple
			items={items}
			value={aircraft_type}
			onValueChange={value => filter({ aircraft_type: value })}
		/>
	);

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