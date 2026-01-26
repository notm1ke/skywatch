import { SelectOption } from ".";
import { Circle, CircleDashed } from "lucide-react";

export const FractionalOwnership: SelectOption[] = [
	{
		label: "Fractionally Owned",
		value: "true",
		icon: CircleDashed,
		color: "secondary",
		varColor: "var(--color-zinc-400)"
	},
	{
		label: "Solely Owned",
		value: "false",
		icon: Circle,
		color: "secondary",
		varColor: "var(--color-zinc-400)"
	}
]