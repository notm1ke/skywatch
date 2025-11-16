"use client";

import { TowerControl } from "lucide-react";
import { usePageControls } from "~/lib/page";
import { ThemeToggle } from "./theme-toggle";
import { GitHubButton } from "./github-button";
import { AnimatedTabs, AnimatedTabItem } from "./ui/animated-tabs";

const NavLinks: AnimatedTabItem[] = [
	{ content: "US Airspace", tabType: "airspace", href: "/" },
	// { content: "Airports", tabType: "airports", href: "/airports" },
];

export const Header = () => {
	const { setActiveTab } = usePageControls();
	return (
		<header className="border-b dark:border-zinc-800 bg-background">
			<div className="flex h-16 items-center px-5 justify-between">
				<div className="flex items-center gap-2">
					<TowerControl className="size-7" />
					<span className="text-2xl font-serif font-normal tracking-tight">Skywatch</span>
				</div>
				<div className="flex flex-items-center gap-2">
					<ThemeToggle />
					<GitHubButton />
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