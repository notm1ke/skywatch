"use client";

import Link from "next/link";

import { Searchbar } from "./search";
import { TowerControl } from "lucide-react";
import { usePageControls } from "~/lib/page";
import { ThemeToggle } from "./theme-toggle";
import { GitHubButton } from "./github-button";
import { HeaderEnvBadge } from "./header-env-badge";
import { AnimatedTabs, AnimatedTabItem } from "./ui/animated-tabs";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const NavLinks: AnimatedTabItem[] = [
	{ content: "Airspaces",  tabType: "airspaces",  href: "/",           hint: "1" },
	{ content: "Airports",   tabType: "airports",   href: "/airports",   hint: "2" },
	{ content: "Planes",     tabType: "airplanes",  href: "/planes",     hint: "3" },
	// { content: "Routing", tabType: "routing", href: "/routing" },
	{ content: "TFRs",       tabType: "tfrs",       href: "/tfrs",       hint: "4" },
	{ content: "Waypoints",  tabType: "waypoints",  href: "/waypoints",  hint: "5" },
	{ content: "Statistics", tabType: "statistics", href: "/statistics", hint: "6" },
];

export const Header = () => {
	const router = useRouter();
	const { setActiveTab } = usePageControls();
	const [showHints, setShowHints] = useState(false);

	useEffect(() => {
		const isInputFocused = () => {
			const el = document.activeElement;
			return (
				el instanceof HTMLInputElement ||
				el instanceof HTMLTextAreaElement ||
				el instanceof HTMLSelectElement ||
				(el as HTMLElement)?.isContentEditable
			);
		};

		const handleKeyDown = (e: KeyboardEvent) => {
			if (isInputFocused()) return;
			if (e.key === "Alt") setShowHints(true);
			if (e.altKey) {
				const m = e.code.match(/^Digit([1-6])$/);
				if (m) {
					e.preventDefault();
					const item = NavLinks[parseInt(m[1]) - 1];
					setActiveTab(item.tabType);
					router.push(item.href);
				}
			}
		};

		const handleKeyUp = (e: KeyboardEvent) => {
			if (e.key === "Alt") setShowHints(false);
		};

		window.addEventListener("keydown", handleKeyDown);
		window.addEventListener("keyup", handleKeyUp);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
			window.removeEventListener("keyup", handleKeyUp);
		};
	}, [setActiveTab, router]);

	return (
		<header className="border-b dark:border-zinc-800 bg-background">
			<div className="flex h-16 items-center px-5 justify-between">
				<Link prefetch href="/" onClick={() => setActiveTab("airspaces")}>
					<div className="flex items-center gap-2 cursor-pointer">
						<TowerControl className="size-7" />
						<span className="text-2xl font-serif font-normal tracking-tight">Skywatch</span>
						<HeaderEnvBadge />
					</div>
				</Link>
				<div className="flex flex-items-center sm:gap-2">
					<Searchbar />
					<div className="sm:space-x-0.5">
						<ThemeToggle />
						<GitHubButton />
					</div>
				</div>
			</div>

			<div className="border-t dark:border-zinc-800">
				<AnimatedTabs
					items={NavLinks}
					defaultValue="/"
					showHints={showHints}
					onChange={item => setActiveTab(item.tabType)}
				/>
			</div>
		</header>
	)
};