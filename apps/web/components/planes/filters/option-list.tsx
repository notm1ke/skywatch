import { ReactNode } from "react";
import { Search } from "lucide-react";
import { SelectOption } from "..";
import { toggleValue } from "./utils";
import { ScrollArea } from "~/components/ui/scroll-area";
import { FilterCheck } from "~/components/airports/filter-sidebar";

export const FilterOptionList = ({
	items,
	value = [],
	onValueChange,
	multiple = false,
	emptyMessage = "No results found.",
}: {
	items: SelectOption[];
	value?: string[];
	onValueChange: (value: string[]) => void;
	multiple?: boolean;
	emptyMessage?: ReactNode;
}) => {
	if (!items.length) return (
		<div className="flex flex-1 items-center justify-center px-4 py-6 text-sm text-muted-foreground text-center">
			{emptyMessage}
		</div>
	);

	return (
		<ScrollArea className="flex-1 min-h-0">
			<div className="flex flex-col py-1">
				{items.map((item) => (
					<FilterCheck
						key={item.value}
						label={item.label}
						value={item.value}
						active={value.includes(item.value)}
						onToggle={(v) => onValueChange(toggleValue(value, v, multiple))}
					/>
				))}
			</div>
		</ScrollArea>
	);
};

export const FilterSearchList = ({
	query,
	onQueryChange,
	placeholder,
	...listProps
}: {
	query: string;
	onQueryChange: (query: string) => void;
	placeholder?: string;
} & Parameters<typeof FilterOptionList>[0]) => (
	<div className="flex flex-1 min-h-0 flex-col overflow-hidden">
		<div className="flex items-center relative font-mono tracking-tight text-sm w-full h-[41px] shrink-0 border-b">
			<div className="flex absolute left-4 top-0 bottom-0 items-center justify-center pointer-events-none">
				<Search className="size-3.5 text-muted-foreground" />
			</div>
			<input
				type="text"
				value={query}
				onChange={(e) => onQueryChange(e.target.value)}
				placeholder={placeholder}
				className="w-full h-full pl-10 pr-10 bg-transparent outline-none text-xs placeholder:text-muted-foreground"
			/>
		</div>
		<FilterOptionList {...listProps} />
	</div>
);
