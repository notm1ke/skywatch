import { InspectorTabType, useAirportInspector } from "./store";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from "~/components/ui/dropdown-menu";

import {
	BookOpenText,
	ChevronDown,
	LucideIcon,
	Megaphone,
	Plane,
	TowerControl
} from "lucide-react";


type TabMeta = {
	title: string;
	icon: LucideIcon;
}

const Tabs: Record<InspectorTabType, TabMeta> = {
	operations: {
		title: "Operations",
		icon: TowerControl
	},
	traffic: {
		title: "Traffic",
		icon: Plane
	},
	notams: {
		title: "NOTAMs",
		icon: Megaphone
	},
	reference: {
		title: "Reference",
		icon: BookOpenText
	}
}

export const TabSwitcher: React.FC<{ disabled?: boolean }> = ({ disabled }) => {
	const { tab, switchTab } = useAirportInspector();
	const metadata = Tabs[tab];
	
	return (
		<div className="flex flex-row pr-3 py-2 justify-between border-b">
			<DropdownMenu>
				<DropdownMenuTrigger className="ml-2 disabled:cursor-not-allowed" disabled={disabled}>
					<div className="flex flex-row items-center gap-1 pl-1 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors duration-250 rounded-md">
						<span className="text-md font-semibold">
							{metadata.title}
						</span>
						<ChevronDown className="size-5 text-zinc-400 dark:text-zinc-500" />
					</div>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="start">
					{Object.entries(Tabs).map(([key, value]) => (
						<DropdownMenuItem key={key} onClick={() => switchTab(key as InspectorTabType)}>
							<value.icon />
							{value.title}
						</DropdownMenuItem>
					))}
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	)
}