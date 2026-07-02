import { cn } from "cnfast";
import { orpc } from "~/lib/gateway";
import { useRef, useState } from "react";
import { immediately } from "~/lib/utils";
import { Kbd, KbdGroup } from "../ui/kbd";
import { useMap } from "react-map-gl/mapbox";
import { useWaypointControls } from "./store";
import { useMobile } from "../mobile-provider";
import { ScrollArea } from "../ui/scroll-area";
import { WaypointDetailsPane } from "./details";
import { UsStateAbbreviations } from "~/lib/geo";
import { useDebounce } from "~/hooks/use-debounce";
import { AnimatedNumber } from "../ui/animated-number";
import { useKeyHandler } from "~/hooks/use-key-handler";
import { useClickOutside } from "~/hooks/use-click-outside";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { Waypoint, WaypointUseLocalizations } from "@skywatch/gateway/schemas";
import { InputGroup, InputGroupAddon, InputGroupInput } from "../ui/input-group";

import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle
} from "../ui/empty";

import {
	ArrowUpDown,
	CircleX,
	CornerDownLeft,
	FileQuestion,
	Helicopter,
	LandPlot,
	LayoutGrid,
	Loader,
	LucideIcon,
	Navigation,
	Radar,
	Search,
	Sparkle,
	SplinePointer,
	Tangent,
	TriangleAlert
} from "lucide-react";

export const WaypointTypeIcon: Record<string, { icon: LucideIcon, color: string }> = {
	"RADAR": { icon: Radar, color: "text-green-600" },
	"WP": { icon: Sparkle, color: "text-purple-400 dark:text-purple-700 dark:opacity-85" },
	"CN": { icon: Navigation, color: "text-blue-400" },
	"MW": { icon: Helicopter, color: "text-lime-800" },
	"NRS": { icon: LayoutGrid, color: "text-teal-700" },
	"VFR": { icon: LandPlot, color: "text-teal-700" },
	"RP": { icon: SplinePointer, color: "text-teal-700" },
	"MR": { icon: Tangent, color: "text-teal-700" }
}

export const renderWaypointLocation = (match: Waypoint) => {
	if (!match.state_code.trim().length) return "Unknown";
	if (match.state_code === "OA") return "Atlantic Ocean";
	if (match.state_code === "OP") return "Pacific Ocean";
	if (match.state_code === "OG") return "Gulf of America";
	
	// islands and other things we don't need to localize
	if (!UsStateAbbreviations[match.state_code]) return "Unknown";
	
	return `${UsStateAbbreviations[match.state_code]}, US`;
}

export const WaypointSearchbar = () => {
	const { mobile, pending } = useMobile();
	const { active, query, style, activate, deactivate, search } = useWaypointControls();
	
	const [visible, setVisible] = useState(false);
	const [selected, setSelected] = useState<number | null>(0);
	
	const mapRef = useMap();
	const containerRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const detailsRef = useRef<HTMLDivElement>(null);
	const scrollAreaRef = useRef<HTMLDivElement>(null);
	const debouncedQuery = useDebounce(query, 250);

	const { data, isLoading, error } = useQuery(orpc.airspace.waypoints.search.queryOptions({
		input: { query: debouncedQuery },
		placeholderData: keepPreviousData,
		enabled: !!debouncedQuery,
	}));
	
	const activateWaypoint = (waypoint: Waypoint) => {
		activate(waypoint);
		mapRef.current?.flyTo({
			center: {
				lat: waypoint.latitude_deg,
				lng: waypoint.longitude_deg,
			},
			duration: 1500,
			zoom: 12
		});
		
		setVisible(false);
		setSelected(0);
		inputRef.current?.blur();
	}
	
	const scroll = (resultIndex: number, behavior: ScrollBehavior = "smooth") => scrollAreaRef
		.current
		?.querySelector(`#waypoint-result-${resultIndex}`)
		?.scrollIntoView({ behavior, block: "nearest" });
	
	const dismiss = () => {
		if (!active) return;
		search("");
		deactivate();
		inputRef?.current?.focus();
	}

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
			if (selected !== null) {
				const waypoint = data![selected];
				activateWaypoint(waypoint);
			}
		},
		"keyf": () => {
			if (visible) return;
			inputRef.current?.focus();
			setVisible(true);
		},
		"escape": () => {
			if (!visible) return;
			inputRef.current?.blur();
			setVisible(false);
			setSelected(0);
		}
	}, true);
	
	useClickOutside(
		containerRef,
		() => setVisible(false),
		[detailsRef]
	);
	
	return (
		<div ref={containerRef} className="absolute top-2 left-2 w-[95svw] sm:w-md">
			<div className="flex flex-col space-y-2">
				<InputGroup className={cn(
					"bg-background dark:bg-input/30 dark:backdrop-blur-xl h-12 sm:h-10",
					style !== "default" && "dark:mix-blend-difference border-none"
				)}>
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
						{!visible && !active && (
							<Kbd className="animate-in fade-in hidden sm:inline-flex">F</Kbd>
						)}
						
						{active && (
							<Tooltip>
								<TooltipTrigger asChild>
									<CircleX
										className="text-muted-foreground size-4 cursor-pointer"
										onClick={dismiss}
									/>
								</TooltipTrigger>
								<TooltipContent side="bottom">
									Dismiss {active.waypoint_id}
								</TooltipContent>
							</Tooltip>
						)}
						
						{isLoading && <Loader className="animate-spin duration-200" />}
						{visible && <Kbd className="animate-in fade-in fade-out hidden sm:inline-flex">Esc</Kbd>}
					</InputGroupAddon>
				</InputGroup>
				
				{active && (
					<div
						ref={detailsRef}
						className={cn(
							"bg-background dark:bg-input/80 dark:backdrop-blur-xl rounded-sm border border-border dark:border-zinc-700/80",
							style !== "default" && "dark:bg-input/90"
						)}
					>
						{mobile && (
							<ScrollArea className="h-108 rounded-sm" viewportClassName="divide-y dark:divide-zinc-700/80">
								<WaypointDetailsPane />
							</ScrollArea>
						)}
						
						{(!mobile || pending) && <WaypointDetailsPane />}
					</div>
				)}
				
				{visible && debouncedQuery.length > 0 && !isLoading && (
					<div className={cn(
						"bg-background/80 dark:bg-input/60 rounded-md backdrop-blur-xl border border-border dark:border-zinc-700/80",
						active && "absolute top-12 w-full shadow-xl z-10" // overlay atop active pane
					)}>
						<ScrollArea
							ref={scrollAreaRef}
							className="h-96 rounded-t-md"
							maskClassName="dark:before:from-input/30 dark:after:from-input/30"
						>
							{data?.length === 0 && (
								<div className="p-4 text-center text-muted-foreground flex items-center justify-center min-h-96">
									No results found.
								</div>
							)}
							
							{error && (
								<Empty className="min-h-96 items-center">
									<EmptyHeader>
										<EmptyMedia>
											<div className="bg-amber-200 dark:bg-amber-700 p-2 rounded-lg">
												<TriangleAlert />
											</div>
										</EmptyMedia>
										<EmptyTitle>Something went wrong</EmptyTitle>
										<EmptyDescription>
											We hit a snag while searching waypoints, please try again..
										</EmptyDescription>
									</EmptyHeader>
								</Empty>
							)}
							
							<div className="flex flex-col space-y-1">
								{data?.map((match, i) => {
									const indicator = WaypointTypeIcon[match.waypoint_use_code] ?? {
										icon: FileQuestion,
										color: "text-muted-foreground"
									};
									
									return (
										<div
											key={match.waypoint_id}
											id={`waypoint-result-${i}`}
											onClick={() => activateWaypoint(match)}
											onMouseOver={() => setSelected(i)}
											className={cn(
												"px-4 py-2 cursor-pointer transition-colors duration-75 hover:bg-zinc-200 dark:hover:bg-muted/80",
												selected === i ? "bg-zinc-200 dark:bg-muted/80" : ""
											)}
										>
											<div className="flex flex-row space-x-4 items-center">
												<div>
													<indicator.icon className={cn("size-8", indicator.color)} />
												</div>
												<div className="flex flex-col space-y-0.5">
													<div className="font-medium">{match.waypoint_id}</div>
													<div className="flex flex-row space-x-1.5 text-xs font-mono tracking-tighter text-muted-foreground">
														<span>{WaypointUseLocalizations[match.waypoint_use_code]}</span>
														<span>•</span>
														<span>{renderWaypointLocation(match)}</span>
													</div>
												</div>
											</div>
										</div>
									);
								})}
							</div>
						</ScrollArea>
						
						<div className="hidden sm:block border-t dark:bg-zinc-900 rounded-b-md px-4 py-2">
							<div className="flex rounded-b-md justify-between space-x-3">
								<div>
									<span className="text-muted-foreground font-normal">
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
								</div>
								<div className="flex flex-row space-x-4">
									<div className="flex flex-row gap-1">
										<div className="items-center">
											<Kbd>
												<ArrowUpDown />
											</Kbd>
										</div>
										
										<span className="text-muted-foreground">Navigate</span>
									</div>
									<div className="flex flex-row gap-1">
										<div className="items-center">
											<KbdGroup>
												<Kbd>
													⌘
													<ArrowUpDown />
												</Kbd>
											</KbdGroup>
										</div>
										
										<span className="text-muted-foreground">Top/Bottom</span>
									</div>
									<div className="flex flex-row gap-1">
										<div className="items-center">
											<Kbd>
												<CornerDownLeft />
											</Kbd>
										</div>
										
										<span className="text-muted-foreground">Select</span>
									</div>
								</div>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	)
}
