"use client";

import { TowerControl } from "lucide-react";
import { usePageControls } from "~/lib/page";
import { AnimatedTabs, AnimatedTabItem } from "./ui/animated-tabs";

const NavLinks: AnimatedTabItem[] = [
	{ content: "US Airspace", tabType: "airspace", href: "/" },
	{ content: "Flights", tabType: "cancellations", href: "/cancellations" },
];

export const Header = () => {
	const { setActiveTab } = usePageControls();
	return (
		<header className="border-b dark:border-zinc-800 bg-background">
			<div className="flex h-16 items-center px-5">
				<div className="flex items-center gap-2">
					<TowerControl className="size-7" />
					<span className="text-2xl font-serif font-normal tracking-tight">Skywatch</span>
				</div>
			</div>

			<div className="border-t dark:border-zinc-800">
				<AnimatedTabs
					items={NavLinks}
					defaultValue="/"
					onChange={item => setActiveTab(item.tabType)}
				/>
			</div>
		</header>
	)
};