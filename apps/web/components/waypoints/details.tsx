import moment from "moment-timezone";

import { cn } from "~/lib/utils";
import { Badge } from "../ui/badge";
import { orpc } from "~/lib/gateway";
import { Button } from "../ui/button";
import { useMap } from "react-map-gl/mapbox";
import { useWaypointControls } from "./store";
import { CopyButton } from "../ui/copy-button";
import { useQuery } from "@tanstack/react-query";
import { Skeleton, SkeletonWithDelay } from "../ui/skeleton";
import { TooltipContentProps } from "@radix-ui/react-tooltip";
import { Fragment, PropsWithChildren, ReactNode } from "react";
import { renderWaypointLocation, WaypointTypeIcon } from "./search";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

import {
	AirspaceLocalizations,
	Waypoint,
	WaypointChartLocalizations,
	WaypointUseLocalizations
} from "@skywatch/gateway/schemas";

import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle
} from "../ui/empty";

import {
	CalendarFold,
	Compass,
	FileQuestion,
	Gauge,
	ListTree,
	MapPinned,
	MapPinOff,
	Megaphone,
	Navigation,
	Radar,
	Sparkle,
	SquaresExclude,
	TowerControl,
	TriangleAlert
} from "lucide-react";

const WaypointTypeDescriptions: Record<string, string> = {
	RADAR: "This waypoint is established by Air Traffic Control for vectoring and positioning. Pilots do not usually file these on flight plans, as they are not always associated with a physical ground-based navaid or published GPS waypoint.",
	WP: "This is a standard waypoint for a predetermined geographical position defined by latitude and longitude.",
	CN: "This waypoint is used by onboard navigation computers to define a track, such as a dog-leg in an airway or transition point. They are not used by ATC or while filing flight plans.",
	MW: "This is a waypoint specifically designated for military operations, often used in Military Operations Areas (MOAs) or on Military Training Routes (MTRs), they may not be published on regular enroute charts.",
	NRS: "This waypoint is part of the Navigation Reference System (NRS), and is a grid-based point designated for high-altitude flight planning without the need of ground-based navaids.",
	VFR: "This waypoint is used specifically for VFR navigation, helping pilots navigate complex airspace or through mountainous terrain while maintaining situation awareness.",
	RP: "This waypoint is a designated geographical location in which a pilot must report their position to ATC, on VFR charts it can also indicate a Right Pattern for a certain runway.",
	MR: "This waypoint is a designated geographical location in which military pilots must report their position to ATC, typically used to coordinate transitions between military training airspace and the National Airspace System."
}

const sanitizeRemarks = (waypoint: Waypoint) => waypoint
	.charting_remark
	.replaceAll(".", "")
	.trim();

const TooltipButton: React.FC<PropsWithChildren<{ content: ReactNode, opts?: TooltipContentProps }>> = ({ content, children, opts }) => (
	<Tooltip>
		<TooltipTrigger asChild>
			{children}
		</TooltipTrigger>
		<TooltipContent {...opts}>
			{content}
		</TooltipContent>
	</Tooltip>
);

export const WaypointDetailsPane = () => {
	const mapRef = useMap();
	
	const { active } = useWaypointControls();
	const { data: waypoint, isLoading, error } = useQuery(orpc.airspace.waypoints.findById.queryOptions({
		input: { waypoint_id: active?.waypoint_id ?? "<noop>" },
		enabled: !!active
	}));
	
	if (!active) return null;
	if (isLoading) return (
		<>
			<div className="flex flex-row justify-between items-center px-4 py-4">
				<div className="flex flex-row space-x-4 items-center">
					<div>
						<Sparkle className="size-8 text-muted-foreground animate-pulse" />
					</div>
					<div className="flex flex-col space-y-0.5">
						<Skeleton className="h-7 w-32" />
						<Skeleton className="h-5 w-24" />
					</div>
				</div>
			</div>
			
			<div className="px-[22px] py-4 flex flex-col space-y-0.5">
				<Skeleton className="h-5 w-full" />
				<Skeleton className="h-5 w-2/3" />
			</div>
			
			<div className="px-[22px] py-4">
				<div className="flex flex-col space-y-4">
					{Array.from({ length: 6 }).map((_, i) => (
						<Fragment key={`waypoint-details-skeleton-details-${i}`}>
							<div className="flex flex-row items-start gap-3">
								<SkeletonWithDelay className="size-5" delay={i * 75} />
								<div className="flex flex-col space-y-0.5">
									<SkeletonWithDelay className="h-5 w-24" delay={i * 75} />
									<SkeletonWithDelay className="h-5 w-48" delay={i * 75} />
								</div>
							</div>
						</Fragment>
					))}
				</div>
			</div>
		</>
	);
	
	if (error || !waypoint) return (
		<Empty className="min-h-96 items-center">
			<EmptyHeader>
				<EmptyMedia>
					<div className="bg-amber-200 dark:bg-amber-700 p-2 rounded-lg">
						<TriangleAlert />
					</div>
				</EmptyMedia>
				<EmptyTitle>Something went wrong</EmptyTitle>
				<EmptyDescription>
					We hit a snag while loading this waypoint&apos;s details, please try again.
				</EmptyDescription>
			</EmptyHeader>
		</Empty>
	);
	
	const indicator = WaypointTypeIcon[waypoint.waypoint_use_code] ?? {
		icon: FileQuestion,
		color: "text-muted-foreground"
	};
	
	const focusMap = () => mapRef.current?.flyTo({
		center: {
			lat: waypoint.latitude_deg,
			lng: waypoint.longitude_deg,
		},
		duration: 1500,
		zoom: 14
	});
	
	return (
		<>
			<div className="flex flex-row justify-between items-center px-4 py-4">
				<div className="flex flex-row space-x-4 items-center">
					<div>
						<indicator.icon className={cn("size-8", indicator.color)} />
					</div>
					<div className="flex flex-col space-y-0.5">
						<div className="font-medium">{waypoint.waypoint_id}</div>
						<div className="flex flex-row space-x-1.5 text-xs font-mono tracking-tighter text-muted-foreground">
							<span>{WaypointUseLocalizations[waypoint.waypoint_use_code]}</span>
						</div>
					</div>
				</div>
			</div>
			
			<div className="px-[22px] py-4 font-mono tracking-tighter">
				{WaypointTypeDescriptions[waypoint.waypoint_use_code] ?? "There is no description for this waypoint type."}
			</div>
			
			<div className="px-[22px] py-4">
				<div className="flex flex-col space-y-4">
					{/* location + coords */}
					<div className="flex flex-row justify-between">
						<div className="flex flex-row items-start gap-3">
							<Compass className={cn("size-5 mt-[3px]", indicator.color)} />
							<div className="flex flex-col space-y-0.5 font-mono">
								<div>{renderWaypointLocation(waypoint)}</div>
								<div className="text-xs text-muted-foreground">
									{waypoint.latitude_deg.toFixed(6)}, {waypoint.longitude_deg.toFixed(6)}
								</div>
							</div>
						</div>
						<div className="flex flex-row space-x-2">
							<TooltipButton content="Jump to Waypoint" opts={{ side: "bottom" }}>
								<Button variant="outline" size="icon-sm" onClick={focusMap}>
									<Navigation className="dark:text-muted-foreground" />
								</Button>
							</TooltipButton>
							
							<TooltipButton content="Copy coordinates to clipboard" opts={{ side: "bottom" }}>
								<CopyButton
									value={`${waypoint.latitude_deg}, ${waypoint.longitude_deg}`}
									variant="outline"
									size="icon-sm"
									className="dark:text-muted-foreground"
								/>
							</TooltipButton>
						</div>
					</div>
					
					{/* airspace info */}
					<div className="flex flex-row items-start gap-3">
						<Radar className={cn("size-5 mt-[3px]", indicator.color)} />
						<div className="flex-col space-y-0.5 font-mono">
							<div>Airspace</div>
							<div className="text-xs text-muted-foreground">
								{waypoint.artcc_id_high}{" - "}
								{AirspaceLocalizations[waypoint.artcc_id_high]} Center
							</div>
						</div>
					</div>
					
					{/* currently in use */}
					{waypoint.airports.length > 0 && (
						<div className="flex flex-row items-start gap-3">
							<TowerControl className={cn("size-5 mt-[3px]", indicator.color)} />
							<div className="flex-col space-y-0.5 font-mono">
								<div>Associated Airports</div>
								<div className="text-xs text-muted-foreground">
									{waypoint.airports.join(", ")}
								</div>
							</div>
						</div>
					)}
					
					{/* special use airspace */}
					{waypoint.special_use_flag && (
						<div className="flex flex-row items-start gap-3">
							<SquaresExclude className={cn("size-5 mt-[3px]", indicator.color)} />
							<div className="flex-col space-y-0.5 font-mono">
								<div>Special Use Airspace</div>
								<div className="text-xs text-muted-foreground">
									This airspace has special operating restrictions
								</div>
							</div>
						</div>
					)}
					
					{/* min reception alt */}
					{waypoint.min_reception_alt > 0 && (
						<div className="flex flex-row items-start gap-3">
							<Gauge className={cn("size-5 mt-[3px]", indicator.color)} />
							<div className="flex-col space-y-0.5 font-mono">
								<div>Minimum Reception Altitude</div>
								<div className="text-xs text-muted-foreground">
									{waypoint.min_reception_alt.toLocaleString()} ft
								</div>
							</div>
						</div>
					)}
					
					{/* compulsory reporting */}
					{waypoint.compulsory.length > 0 && (
						<div className="flex flex-row items-start gap-3">
							<Megaphone className={cn("size-5 mt-[3px]", indicator.color)} />
							<div className="flex-col space-y-0.5 font-mono">
								<div>Compulsory Reporting Point</div>
								<div className="text-xs text-muted-foreground">
									Mandatory ATC contact for {waypoint.compulsory.split('/').map(segment => segment.toLowerCase() + " altitude").join(', ')} traffic
								</div>
							</div>
						</div>
					)}
					
					{/* effective date */}
					{!!waypoint.effective_date && (
						<div className="flex flex-row items-start gap-3">
							<CalendarFold className={cn("size-5 mt-[3px]", indicator.color)} />
							<div className="flex-col space-y-0.5 font-mono">
								<div>Last Updated</div>
								<div className="text-xs text-muted-foreground">
									{moment(waypoint.effective_date, "YYYY/MM/DD").format('MMM Do, YYYY')}
								</div>
							</div>
						</div>
					)}
					
					{/* chart remarks */}
					{sanitizeRemarks(waypoint).length > 0 && (
						<div className="flex flex-row items-start gap-3">
							<ListTree className={cn("size-5 mt-[3px]", indicator.color)} />
							<div className="flex-col space-y-0.5 font-mono">
								<div>Chart Remarks</div>
								<div className="text-xs text-muted-foreground">
									{sanitizeRemarks(waypoint)}
								</div>
							</div>
						</div>
					)}
					
					{/* published within */}
					<div className="flex flex-row items-start gap-3">
						{
							waypoint.charts.length === 0
								? <MapPinOff className={cn("size-5 mt-[3px]", indicator.color)} />
								: <MapPinned className={cn("size-5 mt-[3px]", indicator.color)} />
						}
						
						<div className="flex-col space-y-0.5 font-mono">
							<div>
								{waypoint.charts.length === 0
									? "Publishing Status"
									: "Published Charts"}
							</div>
							<div className="flex flex-col space-y-0.5 text-xs">
								{waypoint.charts.length === 0 && (
									<span className="text-muted-foreground">This waypoint is not published</span>
								)}
								
								{waypoint.charts.length > 0 && waypoint.charts.sort((a, b) => a.localeCompare(b)).map(published => (
									<Badge key={published} variant="secondary">
										{WaypointChartLocalizations[published]}
									</Badge>
								))}
							</div>
						</div>
					</div>
				</div>
			</div>
		</>
	)
}