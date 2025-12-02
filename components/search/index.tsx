"use client";

import { motion } from "motion/react";
import { SearchIcon } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useIsMobile } from "~/hooks/use-mobile";
import { useAirports } from "../airport-provider";
import { cn, hasOpenBackdrop } from "~/lib/utils";
import { useDebounce } from "~/hooks/use-debounce";
import { Kbd, KbdGroup } from "~/components/ui/kbd";
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
	metadata: T;
}

export type SearchResultGenerator<T, M> = (data: T[]) => SearchResult<M>[];
export type SearchResultPredicate<T> = Array<(query: string, item: SearchResult<T>) => boolean>;

export const Searchbar: React.FC = () => {
	const isMobile = useIsMobile();

	const { airports } = useAirports();
	const [isOpen, setIsOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [selected, setSelected] = useState<number | null>(0);
	const [results, setResults] = useState<SearchResult<any>[]>([]);

	const debouncedQuery = useDebounce(searchQuery, 300);
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

	const airportItems = useMemo(() => airportResults(airports), [airports]);;
	const allItems = [...airportItems];
	
	useEffect(() => {
		if (!debouncedQuery.length) return setResults([]);
		const filtered = allItems.filter(item => {
			if (item.type === "airport") return airportPredicates.some(predicate => predicate(debouncedQuery, item));
			// todo: other types
		});
		
		setResults(filtered);
	}, [debouncedQuery]);

	useEffect(() => {
		setSelected(0);
	}, [searchQuery]);

	useEffect(() => {
		if (isOpen) {
			setSelected(0);
		}
	}, [isOpen]);

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (results.length === 0) return;
		if (e.key === "ArrowDown") {
			e.preventDefault();
			setSelected((prev) => ((prev ?? 0) + 1) % results.length);
			return;
		}
		
		if (e.key === "ArrowUp") {
			e.preventDefault();
			setSelected((prev) => ((prev ?? 0) - 1 + results.length) % results.length);
			return;
		}
		
		if (e.key === "Enter") {
			e.preventDefault();
			handleItemClick();
		}
	};

	useEffect(() => {
		if ((selected || selected === 0) && itemRefs.current[selected]) {
			itemRefs.current[selected]?.scrollIntoView({
				block: "nearest",
				behavior: "smooth",
			});
		}
	}, [selected]);

	const handleItemClick = () => {
		const item = selected !== null ? results[selected] : null;
		if (item) window.location.href = item.href;
	};

	return (
		<Search
			open={isOpen}
			onOpenChange={setIsOpen}
			transition={{
				type: "spring",
				bounce: 0.05,
				duration: 0.5,
			}}
		>
			<SearchTrigger triggerRef={triggerRef}>
				{isMobile && (
					<Button
						variant="ghost"
						size="icon"
					>
						<SearchIcon className="size-5.5" />
						<span className="sr-only">Open search menu</span>
					</Button>
				)}

				{!isMobile && (
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
			<SearchContent className="rounded-xl border border-border bg-background! w-[400px] p-0">
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
					<Kbd className="mr-3">Esc</Kbd>
				</motion.div>

				<motion.div
					initial={{ opacity: 0, filter: "blur(5px)" }}
					animate={{ opacity: 1, filter: "blur(0px)", transition: { duration: 1 } }}
					exit={{ opacity: 0, transition: { duration: 0.5 } }}
				>
					{debouncedQuery.length > 0 && (
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
								{results.slice(0, 100).map((item, index) => (
									<motion.button
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										exit={{ opacity: 0, transition: { duration: 0.5 } }}
										key={item.id}
										// @ts-expect-error ref is nullable
										ref={(el) => (itemRefs.current[index] = el)}
										onMouseEnter={() => setSelected(index)}
										onClick={handleItemClick}
										data-id={index}
										className={cn(
											"flex [&>div]:flex [&>div]:flex-row w-full [&>div]:items-center [&>div]:gap-3",
											"rounded-md px-4 py-2 text-left text-sm [&>div]:focus-visible:outline-none"
										)}
									>
										<div className="text-muted-foreground">{item.icon}</div>
										<div className="flex flex-col min-w-0 flex-1">
											<span className="font-medium truncate">
												{item.title}
											</span>
											<span className="text-xs text-muted-foreground truncate">
												{item.subtitle}
											</span>
										</div>
									</motion.button>
								))}
							</AnimatedBackground>
	
							{results.length === 0 && (
								<div className="py-8 text-center text-sm text-muted-foreground">
									No results found
								</div>
							)}
						</ScrollArea>
					)}
				</motion.div>
			</SearchContent>
		</Search>
	);
};
