import { useState } from "react";
import { SelectOption } from "..";
import { orpc } from "~/lib/gateway";
import { Loader } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "~/hooks/use-debounce";
import { usePlaneFilteringControls } from "../store";
import { ComboboxButton } from "~/components/ui/combobox";

export const ManufacturerFilter = () => {
	const [query, setQuery] = useState("");
	const debouncedQuery = useDebounce(query.trim(), 250);
	
	const { manufacturer, filter } = usePlaneFilteringControls();
	const { data, isLoading } = useQuery(orpc.planes.filterOptions.queryOptions({
		input: { type: "manufacturer", input: debouncedQuery },
		enabled: debouncedQuery.length >= 3
	}));
	
	const items = Array<SelectOption>();
	if (data) {
		const opts = data
			.map(item => ({
				label: item,
				value: item,
				color: "secondary",
				varColor: "var(--color-zinc-300)"
			}))
			.sort((a, b) => a!.label.localeCompare(b!.label)) as SelectOption[];
		
		items.push(...opts);
	}
	
	return (
		<ComboboxButton
			multiple
			label="Manufacturer"
			placeholder="Filter manufacturer.."
			items={items}
			query={query}
			value={manufacturer}
			onQueryChange={setQuery}
			onValueChange={value => filter({ manufacturer: value })}
			width={250}
			emptyMessage={
				query.length < 3
					? "Enter atleast 3 characters"
					: isLoading
						? (
							<div className="flex items-center justify-center">
								<Loader className="size-4 animate-spin duration-200" />
							</div>
						)
						: "No manufacturers found"
			}
		/>
	)
}