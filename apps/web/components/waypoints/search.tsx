import { cn } from "cnfast";
import { orpc } from "~/lib/gateway";
import { useRef, useState } from "react";
import { immediately } from "~/lib/utils";
import { Kbd, KbdGroup } from "../ui/kbd";
import { useWaypointControls } from "./store";
import { WaypointDetails } from "./details";
import { typeInfo, waypointLocation } from "./types";
import { ScrollArea } from "../ui/scroll-area";
import { useDebounce } from "~/hooks/use-debounce";
import { AnimatedNumber } from "../ui/animated-number";
import { useKeyHandler } from "~/hooks/use-key-handler";
import { useClickOutside } from "~/hooks/use-click-outside";
import { WaypointUseLocalizations } from "@skywatch/gateway/schemas";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { InputGroup, InputGroupAddon, InputGroupInput } from "../ui/input-group";
import { ArrowUpDown, CornerDownLeft, Loader, Search, TriangleAlert } from "lucide-react";
import type { WaypointIndex } from "./geo";

/**
 * The floating panel over the map: the search box, and below it the waypoint that's open. While you're searching, the
 * results sit on top of the open waypoint instead of pushing it down.
 */
export const WaypointPanel: React.FC<{ index: WaypointIndex }> = ({ index }) => {
	const selectedId = useWaypointControls(state => state.selectedId);
	const query = useWaypointControls(state => state.query);
	const { select, clear, search } = useWaypointControls.getState();

	const [visible, setVisible] = useState(false);
	const [selected, setSelected] = useState<number | null>(0);

	const containerRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const detailsRef = useRef<HTMLDivElement>(null);
	const scrollAreaRef = useRef<HTMLDivElement>(null);
	const debouncedQuery = useDebounce(query, 250);

	const { data, isLoading, error } = useQuery(orpc.airspace.waypoints.search.queryOptions({
		input: { query: debouncedQuery },
		placeholderData: keepPreviousData,
		// opening a waypoint from the map puts its name in the box: that's not a search
		enabled: visible && !!debouncedQuery,
	}));

	const open = (id: string) => {
		select(id, true);
		setVisible(false);
		setSelected(0);
		inputRef.current?.blur();
	};

	const scroll = (resultIndex: number, behavior: ScrollBehavior = "smooth") => scrollAreaRef
		.current
		?.querySelector(`#waypoint-result-${resultIndex}`)
		?.scrollIntoView({ behavior, block: "nearest" });

	const dismiss = () => {
		clear();
		inputRef.current?.focus();
	};

	const interactable = visible && data && data.length;

	useKeyHandler({
		"arrowup": () => {
			if (!interactable) return;

			setSelected(prev => {
				if (prev === null) return 0;
				const calculated = prev - 1 < 0
					? data.length - 1
					: prev - 1;

				immediately(() => scroll(calculated));
				return calculated;
			});
		},
		"meta+arrowup": () => {
			if (!interactable) return;
			setSelected(() => {
				immediately(() => scroll(0, "instant"));
				return 0;
			});
		},
		"meta+arrowdown": () => {
			if (!interactable) return;
			setSelected(() => {
				const target = data.length - 1;
				immediately(() => scroll(target, "instant"));
				return target;
			});
		},
		"arrowdown": () => {
			if (!interactable) return;

			setSelected(prev => {
				if (prev === null) return 0;
				const calculated = prev + 1 >= data.length
					? 0
					: prev + 1;

				immediately(() => scroll(calculated));
				return calculated;
			});
		},
		"enter": () => {
			if (!interactable) return;
			if (selected !== null) open(data![selected].waypoint_id);
		},
		"keyf": () => {
			if (visible) return;
			inputRef.current?.focus();
			setVisible(true);
		},
		"escape": () => {
			// out of the search first, then out of the open waypoint
			if (visible) {
				inputRef.current?.blur();
				setVisible(false);
				setSelected(0);
				return;
			}

			if (useWaypointControls.getState().selectedId) clear();
		}
	}, true);

	useClickOutside(
		containerRef,
		() => setVisible(false),
		[detailsRef]
	);

	return (
		<div ref={containerRef} className="pointer-events-none absolute inset-x-2 top-2 z-10 flex flex-col gap-2 lg:right-auto lg:w-96">
			<InputGroup className="pointer-events-auto h-12 bg-background/90 shadow-lg backdrop-blur sm:h-10 dark:bg-input/30">
				<InputGroupInput
					ref={inputRef}
					value={query}
					placeholder="Search by Waypoint Name"
					onFocus={() => setVisible(true)}
					onChange={(e) => search(e.target.value)}
				/>
				<InputGroupAddon>
					<Search />
				</InputGroupAddon>
				<InputGroupAddon align="inline-end">
					{!visible && (
						<Kbd className="animate-in fade-in hidden sm:inline-flex">F</Kbd>
					)}

					{isLoading && <Loader className="animate-spin duration-200" />}
					{visible && <Kbd className="animate-in fade-in fade-out hidden sm:inline-flex">Esc</Kbd>}
				</InputGroupAddon>
			</InputGroup>

			{selectedId && (
				<div
					ref={detailsRef}
					className="pointer-events-auto overflow-hidden rounded-lg border bg-background/90 shadow-lg backdrop-blur"
				>
					<WaypointDetails id={selectedId} type={index.types.get(selectedId)} onClose={dismiss} />
				</div>
			)}

			{visible && debouncedQuery.length > 0 && !isLoading && (
				<div className={cn(
					"pointer-events-auto overflow-hidden rounded-lg border bg-background/95 shadow-lg backdrop-blur",
					selectedId && "absolute inset-x-0 top-14 z-10 shadow-xl sm:top-12" // over the open waypoint
				)}>
					<ScrollArea
						ref={scrollAreaRef}
						viewportClassName="max-h-[min(24rem,calc(var(--page-height)-12rem))]"
					>
						{data?.length === 0 && (
							<div className="px-4 py-10 text-center text-sm text-muted-foreground">
								No waypoints start with &ldquo;{debouncedQuery.toUpperCase()}&rdquo;.
							</div>
						)}

						{error && (
							<div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
								<div className="rounded-lg bg-amber-200 p-2 dark:bg-amber-700">
									<TriangleAlert className="size-5" />
								</div>
								<div className="text-sm font-medium">Something went wrong</div>
								<p className="text-xs text-muted-foreground">We hit a snag while searching waypoints, please try again.</p>
							</div>
						)}

						<div className="flex flex-col">
							{data?.map((match, i) => {
								const info = typeInfo(match.waypoint_use_code);

								return (
									<div
										key={match.waypoint_id}
										id={`waypoint-result-${i}`}
										onClick={() => open(match.waypoint_id)}
										onMouseOver={() => setSelected(i)}
										className={cn(
											"flex cursor-pointer items-center gap-3 px-3 py-2 transition-colors duration-75",
											selected === i ? "bg-accent" : "hover:bg-accent/60"
										)}
									>
										<div
											className="flex size-9 shrink-0 items-center justify-center rounded-md"
											style={{ backgroundColor: `${info.color}26` }}
										>
											<info.icon className="size-4" style={{ color: info.color }} />
										</div>

										<div className="flex min-w-0 flex-col">
											<div className="font-mono font-semibold">{match.waypoint_id}</div>
											<div className="truncate text-xs text-muted-foreground">
												{WaypointUseLocalizations[match.waypoint_use_code] ?? match.waypoint_use_code} · {waypointLocation(match.state_code)}
											</div>
										</div>
									</div>
								);
							})}
						</div>
					</ScrollArea>

					<div className="hidden border-t bg-muted/30 px-4 py-2 text-xs sm:block">
						<div className="flex justify-between space-x-3">
							<span className="text-muted-foreground">
								<AnimatedNumber
									value={data?.length ?? 0}
									className="font-mono tracking-normal"
									springOptions={{
										bounce: 0,
										duration: 500,
									}}
								/>{" "}
								match{data?.length === 1 ? "" : "es"}
							</span>

							<div className="flex flex-row space-x-4 text-muted-foreground">
								<div className="flex flex-row items-center gap-1">
									<Kbd><ArrowUpDown /></Kbd>
									Navigate
								</div>
								<div className="flex flex-row items-center gap-1">
									<KbdGroup>
										<Kbd>
											⌘
											<ArrowUpDown />
										</Kbd>
									</KbdGroup>
									Top/Bottom
								</div>
								<div className="flex flex-row items-center gap-1">
									<Kbd><CornerDownLeft /></Kbd>
									Select
								</div>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
