"use client";

import { cn } from "cnfast";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useMobile } from "../mobile-provider";
import { AnimatePresence } from "motion/react";
import { Button } from "~/components/ui/button";
import { useAirports } from "../airport-provider";
import { hasOpenBackdrop } from "~/lib/utils";
import { CircleX, SearchIcon } from "lucide-react";
import { Kbd, KbdGroup } from "~/components/ui/kbd";
import { TabType, usePageControls } from "~/lib/page";
import { ScrollArea } from "~/components/ui/scroll-area";
import { airportPredicates, airportResults } from "./airports";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { AnimatedBackground } from "~/components/ui/animated-background";
import { Search, SearchContent, SearchTrigger } from "~/components/ui/morphing-search";

export type SearchResult<T> = {
	id: string;
	title: string;
	subtitle: string;
	icon: ReactNode;
	href: string;
	type: "airport" | "page";
	tabTarget: TabType;
	metadata: T;
}

export type SearchResultGenerator<T, M> = (data: T[]) => SearchResult<M>[];
export type SearchResultPredicate<T> = Array<(query: string, item: SearchResult<T>) => boolean>;

export const Searchbar: React.FC = () => {
	const router = useRouter();
	
	const { mobile, pending } = useMobile();
	const { setActiveTab } = usePageControls();

	const { airports } = useAirports();
	const [isOpen, setIsOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [selected, setSelected] = useState<number | null>(0);
	const [results, setResults] = useState<SearchResult<any>[]>([]);

	const triggerRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (hasOpenBackdrop() && !isOpen) return;
			if ((e.metaKey || e.ctrlKey) && e.key === "k") {
				e.preventDefault();
				setIsOpen(!isOpen);
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen]);

	const airportItems = useMemo(() => airportResults(airports), [airports]);
	const allItems = [...airportItems];

	const defaultResults = useMemo(() =>
		["SFO", "LAX", "JFK", "EWR", "ORD", "DFW", "ATL", "IAD", "DEN"]
			.map(iata => airportItems.find(item => item.metadata.iata_code === iata))
			.filter(Boolean) as SearchResult<any>[],
		[airportItems]
	);

	useEffect(() => {
		if (!searchQuery.length) return setResults([]);
		const filtered = allItems.filter(item => {
			if (item.type === "airport") return airportPredicates.some(predicate => predicate(searchQuery, item));
			// todo: other types
		});

		setResults(filtered);
	}, [searchQuery]);

	const isDefault = !searchQuery.length;
	const displayedItems = isDefault ? defaultResults : results;

	useEffect(() => {
		setSelected(0);
	}, [searchQuery]);

	useEffect(() => {
		if (isOpen) {
			setSelected(0);
			return;
		}
		
		setSearchQuery("");
	}, [isOpen]);

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (displayedItems.length === 0) return;
		if (e.key === "ArrowDown") {
			e.preventDefault();
			setSelected((prev) => ((prev ?? 0) + 1) % displayedItems.length);
			return;
		}

		if (e.key === "ArrowUp") {
			e.preventDefault();
			setSelected((prev) => ((prev ?? 0) - 1 + displayedItems.length) % displayedItems.length);
			return;
		}

		if (e.key === "Enter") {
			e.preventDefault();
			handleItemClick();
		}
	};

	useEffect(() => {
		const href = displayedItems[selected ?? 0]?.href;
		if ((selected || selected === 0) && itemRefs.current[selected] && href) {
			router.prefetch(href);
			itemRefs.current[selected]?.scrollIntoView({
				block: "nearest",
				behavior: "smooth",
			});
		}
	}, [selected]);

	const handleItemClick = () => {
		const item = selected !== null ? displayedItems[selected] : null;
		if (item) {
			setActiveTab(item.tabTarget);
			setIsOpen(false);
			
			setTimeout(() => {
				router.push(item.href);
			}, 50);
		}
	};
	
	if (pending) return null;

	return (
		<Search
			open={isOpen}
			onOpenChange={setIsOpen}
			transition={{
				ease: [0.22, 1, 0.36, 1],
				duration: 0.3,
			}}
			variants={{
				initial: { clipPath: "inset(0 100% 0 0)" },
				animate: { clipPath: "inset(0 0% 0 0)" },
				exit: {
					clipPath: "inset(0 100% 0 0)",
					transition: { duration: 0.15, ease: "easeIn" },
				},
			}}
		>
			<SearchTrigger suppressHydrationWarning asChild={mobile} triggerRef={triggerRef}>
				{mobile && (
					<Button
						variant="ghost"
						size="icon"
					>
						<SearchIcon className="size-5.5" />
						<span className="sr-only">Open search menu</span>
					</Button>
				)}

				{!mobile && (
					<motion.div
						ref={triggerRef}
						layoutId="find"
						className="group relative flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/60 hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-w-[324px] cursor-pointer"
					>
						<motion.div
							initial={{ opacity: 0, filter: "blur(4px)" }}
							animate={{ opacity: 1, filter: "blur(0px)" }}
							transition={{ duration: 0.3, delay: 0.1 }}
						>
							<SearchIcon className="h-4 w-4" />
						</motion.div>
						<motion.span
							initial={{ opacity: 0, filter: "blur(4px)" }}
							animate={{ opacity: 1, filter: "blur(0px)" }}
							transition={{ duration: 0.3, delay: 0.15 }}
						>
							Find...
						</motion.span>
						<motion.div
							className="ml-auto"
							initial={{ opacity: 0, filter: "blur(4px)" }}
							animate={{ opacity: 1, filter: "blur(0px)" }}
							transition={{ duration: 0.3, delay: 0.2 }}
						>
							<KbdGroup>
								<Kbd>⌘</Kbd>
								<Kbd>K</Kbd>
							</KbdGroup>
						</motion.div>
					</motion.div>
				)}
			</SearchTrigger>
			<SearchContent asMobile={mobile} className={cn("rounded-xl border border-border bg-background! p-0", !mobile && "w-[400px]")}>
				<motion.div
					layoutId="find"
					className="flex items-center gap-2 px-2 py-4 border-b border-border"
				>
					<SearchIcon className="h-4 w-4 text-muted-foreground ml-3" />
					<input
						ref={inputRef}
						autoFocus
						type="text"
						placeholder="Find..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						onKeyDown={handleKeyDown}
						className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
					/>
					
					<Kbd className="hidden sm:inline mr-3">Esc</Kbd>
					
					{mobile && (
						<Button
							variant="ghost"
							size="sm"
							className={cn("hidden mr-3 h-6 w-6 p-0 cursor-pointer", searchQuery.length > 0 && "inline")}
							onClick={() => setSearchQuery("")}
						>
							<CircleX className="h-3.5 w-3.5" />
						</Button>
					)}
				</motion.div>

				<motion.div
					initial={{ opacity: 0, filter: "blur(4px)" }}
					animate={{ opacity: 1, filter: "blur(0px)", transition: { duration: 0.25 } }}
					exit={{ opacity: 0, transition: { duration: 0.2 } }}
				>
					<AnimatePresence initial={false}>
						{(isDefault || searchQuery.length > 0) && (
							<motion.div
								key="results"
								initial={{ opacity: 0 }}
								animate={{ opacity: 1, transition: { duration: 0.15 } }}
								exit={{ opacity: 0, transition: { duration: 0.1 } }}
							>
								<ScrollArea maskHeight={10} className="h-72 px-1 py-1">
									<AnimatedBackground
										defaultValue={0}
										value={selected}
										setActiveValue={setSelected}
										className="rounded-md bg-zinc-100 dark:bg-zinc-800"
										enableHover
										transition={{
											type: "spring",
											bounce: 0.2,
											duration: 0.2
										}}
									>
											{displayedItems.slice(0, 100).map((item, index) => (
											<motion.button
												layout
												layoutId={`result-${item.id}`}
												initial={{ opacity: 0, y: 4 }}
												animate={{ opacity: 1, y: 0 }}
												transition={{
													layout: { type: "spring", bounce: 0.15, duration: 0.25 },
													opacity: { duration: 0.15 },
												}}
												key={item.id}
												// @ts-expect-error ref is nullable
												ref={(el) => (itemRefs.current[index] = el)}
												onMouseEnter={() => setSelected(index)}
												onClick={handleItemClick}
												data-id={index}
												className={cn(
													"flex [&>div]:flex [&>div]:flex-row w-full [&>div]:w-full [&>div]:items-stretch [&>div]:justify-between",
													"rounded-md px-4 py-2 text-left text-sm [&>div]:focus-visible:outline-none"
												)}
											>
												<div className="flex flex-col min-w-0 flex-1 justify-center">
													<span className="font-medium truncate">
														{item.title}
													</span>
													<span className="text-xs text-muted-foreground truncate">
														{item.subtitle}
													</span>
												</div>
												<div className="flex items-center shrink-0 pl-3 text-muted-foreground">
													{item.icon}
												</div>
											</motion.button>
										))}
									</AnimatedBackground>

									{!isDefault && results.length === 0 && (
										<div className="py-8 text-center text-sm text-muted-foreground">
											No results found
										</div>
									)}
								</ScrollArea>
							</motion.div>
						)}
					</AnimatePresence>
				</motion.div>
			</SearchContent>
		</Search>
	);
};