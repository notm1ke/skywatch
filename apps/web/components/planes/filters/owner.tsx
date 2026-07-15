import { useState } from "react";
import { SelectOption } from "..";
import { orpc } from "~/lib/gateway";
import { Loader, UserRound } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "~/hooks/use-debounce";
import { usePlaneFilteringControls } from "../store";
import { FilterSearchList } from "./option-list";
import { ComboboxButton } from "~/components/ui/combobox";

export const OwnerFilter = ({ mode = "button" }: { mode?: "button" | "list" }) => {
	const [query, setQuery] = useState("");
	const debouncedQuery = useDebounce(query.trim(), 250);

	const { owner_name, filter } = usePlaneFilteringControls();
	const { data, isLoading } = useQuery(orpc.planes.filterOptions.queryOptions({
		input: { type: "owner_name", input: debouncedQuery },
		enabled: debouncedQuery.length >= 3
	}));

	const items = Array<SelectOption>();
	if (data) {
		const opts = data
			.map(item => ({
				label: item,
				value: item,
				color: "secondary",
				icon: UserRound,
				varColor: "var(--color-zinc-300)"
			}))
			.sort((a, b) => a!.label.localeCompare(b!.label)) as SelectOption[];

		items.push(...opts);
	}

	const emptyMessage = query.length < 3
		? "Enter atleast 3 characters"
		: isLoading
			? (
				<div className="flex items-center justify-center">
					<Loader className="size-4 animate-spin duration-200" />
				</div>
			)
			: "No owners found";

	if (mode === "list") return (
		<FilterSearchList
			multiple
			query={query}
			items={items}
			value={owner_name}
			onQueryChange={setQuery}
			onValueChange={value => filter({ owner_name: value })}
			placeholder="Filter owner.."
			emptyMessage={emptyMessage}
		/>
	);

	return (
		<ComboboxButton
			multiple
			label="Owner"
			placeholder="Filter owner.."
			items={items}
			query={query}
			value={owner_name}
			onQueryChange={setQuery}
			onValueChange={value => filter({ owner_name: value })}
			width={250}
			emptyMessage={emptyMessage}
		/>
	)
}