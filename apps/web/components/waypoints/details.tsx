import moment from "moment-timezone";
import Link from "next/link";

import { orpc } from "~/lib/gateway";
import { Badge } from "../ui/badge";
import { Leg } from "../routing/leg";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";
import { CopyButton } from "../ui/copy-button";
import { ScrollArea } from "../ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { useWaypointControls } from "./store";
import { useWaypointUsage } from "./use-usage";
import { PropsWithChildren, ReactNode } from "react";
import { airwayColor, typeInfo, waypointLocation } from "./types";
import { Navigation, TriangleAlert, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

import {
	AirspaceLocalizations,
	WaypointChartLocalizations,
	WaypointUseLocalizations
} from "@skywatch/gateway/schemas";

const sanitizeRemarks = (remark: string) => remark
	.replaceAll(".", "")
	.trim();

const Tip: React.FC<PropsWithChildren<{ label: string }>> = ({ label, children }) => (
	<Tooltip>
		<TooltipTrigger asChild>{children}</TooltipTrigger>
		<TooltipContent side="bottom">{label}</TooltipContent>
	</Tooltip>
);

const Section: React.FC<PropsWithChildren<{ title: string }>> = ({ title, children }) => (
	<section className="grid gap-2 border-t px-3 py-3">
		<h3 className="font-mono text-[10px] font-medium tracking-wider text-muted-foreground uppercase">{title}</h3>
		{children}
	</section>
);

const Row: React.FC<{ label: string; value: ReactNode }> = ({ label, value }) => (
	<div className="flex gap-2 text-xs">
		<span className="w-16 shrink-0 text-muted-foreground">{label}</span>
		<span className="min-w-0 wrap-anywhere font-mono">{value}</span>
	</div>
);

const Muted: React.FC<PropsWithChildren> = ({ children }) => (
	<p className="text-xs text-muted-foreground">{children}</p>
);

type Props = {
	id: string;
	/** the type, when the map already knows it: the header can show its color before anything has loaded */
	type?: string;
	onClose: () => void;
};

export const WaypointDetails: React.FC<Props> = ({ id, type, onClose }) => {
	const { data: waypoint, isLoading, error } = useQuery(orpc.airspace.waypoints.findById.queryOptions({
		input: { waypoint_id: id }
	}));

	const { data: usage, isLoading: usageLoading } = useWaypointUsage(id);

	const code = waypoint?.waypoint_use_code ?? type ?? "";
	const info = typeInfo(code);

	return (
		<div className="flex min-h-0 flex-col">
			<div className="flex shrink-0 items-start gap-3 p-3">
				<div
					className="flex size-10 shrink-0 items-center justify-center rounded-md"
					style={{ backgroundColor: `${info.color}26` }}
				>
					<info.icon className="size-5" style={{ color: info.color }} />
				</div>

				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-1">
						<span className="font-mono text-lg leading-tight font-semibold tracking-tight">{id}</span>
						<Tip label="Copy the name">
							<CopyButton value={id} variant="ghost" size="icon-sm" className="size-6 text-muted-foreground" iconSize="size-3.5" />
						</Tip>
					</div>
					<div className="truncate text-xs text-muted-foreground">
						{code ? (WaypointUseLocalizations[code] ?? code) : "Waypoint"}
						{waypoint && <> · {waypointLocation(waypoint.state_code)}</>}
					</div>
				</div>

				<Tip label="Close">
					<Button variant="ghost" size="icon-sm" className="size-7 text-muted-foreground" aria-label="Close" onClick={onClose}>
						<X className="size-4" />
					</Button>
				</Tip>
			</div>

			<ScrollArea className="min-h-0 border-t" viewportClassName="max-h-[calc(var(--page-height)-11rem)]">
				{isLoading && (
					<div className="grid gap-4 p-3">
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-4 w-2/3" />
						<Skeleton className="h-4 w-1/2" />
						<Skeleton className="h-4 w-3/4" />
					</div>
				)}

				{!isLoading && (error || !waypoint) && (
					<div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
						<div className="rounded-lg bg-amber-200 p-2 dark:bg-amber-700">
							<TriangleAlert className="size-5" />
						</div>
						<div className="text-sm font-medium">Couldn&apos;t load {id}</div>
						<Muted>There&apos;s no waypoint by that name, or we hit a snag loading it.</Muted>
					</div>
				)}

				{waypoint && (
					<>
						<p className="mx-3 my-3 rounded-md bg-muted/50 p-2.5 text-xs leading-relaxed text-muted-foreground">
							{info.description}
						</p>

						<Section title="Position">
							<div className="flex items-center justify-between gap-2">
								<div className="font-mono text-sm">
									{waypoint.latitude_deg.toFixed(6)}, {waypoint.longitude_deg.toFixed(6)}
								</div>
								<div className="flex shrink-0 gap-1">
									<Tip label="Jump to waypoint">
										<Button
											variant="outline"
											size="icon-sm"
											className="size-7"
											aria-label="Jump to waypoint"
											onClick={() => useWaypointControls.getState().flyTo(id, 14)}
										>
											<Navigation className="size-3.5 dark:text-muted-foreground" />
										</Button>
									</Tip>
									<Tip label="Copy coordinates">
										<CopyButton
											value={`${waypoint.latitude_deg}, ${waypoint.longitude_deg}`}
											variant="outline"
											size="icon-sm"
											className="size-7 dark:text-muted-foreground"
											iconSize="size-3.5"
										/>
									</Tip>
								</div>
							</div>

							<Row label="Region" value={waypointLocation(waypoint.state_code)} />
							<Row
								label="Airspace"
								value={`${waypoint.artcc_id_high} · ${AirspaceLocalizations[waypoint.artcc_id_high] ?? waypoint.artcc_id_high} Center`}
							/>
							{waypoint.artcc_id_low.trim().length > 0 && waypoint.artcc_id_low !== waypoint.artcc_id_high && (
								<Row
									label="Low alt"
									value={`${waypoint.artcc_id_low} · ${AirspaceLocalizations[waypoint.artcc_id_low] ?? waypoint.artcc_id_low} Center`}
								/>
							)}
							{waypoint.min_reception_alt > 0 && (
								<Row label="MRA" value={`${waypoint.min_reception_alt.toLocaleString()} ft`} />
							)}
							{waypoint.special_use_flag && (
								<Row label="Special use" value="This airspace has special operating restrictions" />
							)}
							{waypoint.compulsory.length > 0 && (
								<Row
									label="Reporting"
									value={`Mandatory ATC contact for ${waypoint.compulsory.split("/").map(segment => segment.toLowerCase() + " altitude").join(", ")} traffic`}
								/>
							)}
						</Section>
					</>
				)}

				{/* what this waypoint is part of: the airways that run through it, and the routes that use it */}
				<Section title={usage && usage.airways.length > 0 ? `Airways · ${usage.airways.length}` : "Airways"}>
					{usageLoading && (
						<div className="flex gap-1.5">
							<Skeleton className="h-5 w-10" />
							<Skeleton className="h-5 w-10" />
							<Skeleton className="h-5 w-10" />
						</div>
					)}

					{usage && usage.airways.length === 0 && <Muted>Not part of any airway.</Muted>}

					{usage && usage.airways.length > 0 && (
						<>
							<div className="flex flex-wrap gap-1.5">
								{usage.airways.map(airway => (
									<span
										key={`${airway.id}-${airway.location}`}
										onMouseEnter={() => useWaypointControls.getState().setHoverAirway(airway.id)}
										onMouseLeave={() => useWaypointControls.getState().setHoverAirway(null)}
										title={`${airway.id}: ${airway.points.length} points on the map`}
										className="inline-flex cursor-default items-center gap-1.5 rounded-sm bg-muted px-1.5 py-0.5 font-mono text-xs"
									>
										<span className="size-2 rounded-full" style={{ backgroundColor: airwayColor(airway.id) }} />
										{airway.id}
									</span>
								))}
							</div>
							<Muted>Drawn on the map. Hover one to pick it out.</Muted>
						</>
					)}
				</Section>

				<Section title="Preferred routes">
					{usageLoading && <Skeleton className="h-4 w-2/3" />}

					{usage && usage.routes.total === 0 && <Muted>Not used in any FAA preferred route.</Muted>}

					{usage && usage.routes.total > 0 && (
						<>
							<Muted>
								In {usage.routes.total.toLocaleString()} preferred route{usage.routes.total === 1 ? "" : "s"}, most between:
							</Muted>

							<div className="grid gap-0.5">
								{usage.routes.pairs.map(pair => (
									<Link
										key={`${pair.origin}-${pair.dest}`}
										href={`/routing?from=airport:${pair.origin}&to=airport:${pair.dest}`}
										className="flex items-center justify-between rounded-sm px-2 py-1 text-sm transition-colors hover:bg-accent"
									>
										<Leg from={pair.origin} to={pair.dest} className="font-mono font-semibold" />
										<span className="font-mono text-xs text-muted-foreground">
											{pair.count} route{pair.count === 1 ? "" : "s"}
										</span>
									</Link>
								))}
							</div>

							{(() => {
								const shown = usage.routes.pairs.reduce((sum, pair) => sum + pair.count, 0);
								return usage.routes.total > shown
									? <Muted>and {(usage.routes.total - shown).toLocaleString()} more between other airports.</Muted>
									: null;
							})()}
						</>
					)}
				</Section>

				{waypoint && (
					<>
						{waypoint.airports.length > 0 && (
							<Section title="Airports">
								<div className="flex flex-wrap gap-1.5">
									{waypoint.airports.map(iata => (
										<Link
											key={iata}
											href={`/airports/${iata}`}
											className="rounded-sm bg-zinc-300 px-1.5 py-0.5 font-mono text-xs font-bold transition-colors hover:bg-zinc-400/70 dark:bg-zinc-700 dark:hover:bg-zinc-600"
										>
											{iata}
										</Link>
									))}
								</div>
								<Muted>Seen in recent traffic at these airports.</Muted>
							</Section>
						)}

						<Section title="Charts">
							{waypoint.charts.length === 0
								? <Muted>This waypoint is not published.</Muted>
								: (
									<div className="flex flex-wrap gap-1.5">
										{[...waypoint.charts].sort((a, b) => a.localeCompare(b)).map(published => (
											<Badge key={published} variant="secondary" className="font-normal">
												{WaypointChartLocalizations[published] ?? published}
											</Badge>
										))}
									</div>
								)}

							{sanitizeRemarks(waypoint.charting_remark).length > 0 && (
								<Row label="Remarks" value={sanitizeRemarks(waypoint.charting_remark)} />
							)}
							{!!waypoint.effective_date && (
								<Row label="Updated" value={moment(waypoint.effective_date, "YYYY/MM/DD").format("MMM Do, YYYY")} />
							)}
						</Section>
					</>
				)}
			</ScrollArea>
		</div>
	);
};
