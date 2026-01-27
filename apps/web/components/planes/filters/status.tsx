import { SelectOption } from "..";
import { orpc } from "~/lib/gateway";
import { useQuery } from "@tanstack/react-query";
import { RegistrationStatuses } from "../statuses";
import { usePlaneFilteringControls } from "../store";
import { ComboboxButton, ComboboxSkeleton } from "~/components/ui/combobox";

export const RegistrationStatusFilter = () => {
	const { status, filter } = usePlaneFilteringControls();
	const { data, isLoading } = useQuery(orpc.planes.filterOptions.queryOptions({
		input: { type: "status" },
	}));
	
	if (!data || isLoading) return (
		<ComboboxSkeleton label="Status" />
	);
	
	const items = data
		.map(item => RegistrationStatuses.find(entry => entry.value.toLowerCase() === item.toLowerCase()))
		.filter(Boolean)
		.sort((a, b) => a!.label.localeCompare(b!.label)) as SelectOption[];
	
	if (!items) return (
		<ComboboxSkeleton label="Status" />
	);
	
	return (
		<ComboboxButton
			multiple
			label="Status"
			placeholder="Filter registration status.."
			items={items}
			value={status}
			onValueChange={value => filter({ status: value })}
		/>
	)
}