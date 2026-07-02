import moment from "moment-timezone";

import { z } from "zod/v4";
import { cn } from "cnfast";
import { orpc } from "~/lib/gateway";
import { motion } from "motion/react";
import { RssPulseIcon } from "~/components/icons/rss";
import { useQuery } from "@tanstack/react-query";
import { Tracker } from "~/components/ui/tracker";
import { ScrollArea } from "~/components/ui/scroll-area";
import { ErrorSection } from "~/components/error-section";
import { SkeletonWithDelay } from "~/components/ui/skeleton";
import { getLatestTimeValue, localizedOrUtc } from "~/lib/utils";
import { AirportWithJoins, IncidentHistoryEntry } from "@skywatch/gateway/schemas";

import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle
} from "~/components/ui/empty";

import {
	CircleOff,
	ClockAlert,
	ClockCheck,
	OctagonMinus,
	PlaneLanding,
	PlaneTakeoff,
	Rss
} from "lucide-react";

type IncidentEntry = z.infer<typeof IncidentHistoryEntry>["incidents"][number];

const incidentColor = (incident: IncidentEntry) => {
	switch (incident.event_type) {
		case "airport_closure": return "text-red-400 dark:text-red-600";
		case "ground_stop": return "text-orange-400 dark:text-orange-600";
		case "ground_delay": return "text-yellow-400 dark:text-yellow-600";
		case "dual_delay": return "text-yellow-400 dark:text-yellow-600";
		case "departure_delay": return "text-yellow-400 dark:text-yellow-600";
		case "arrival_delay": return "text-yellow-400 dark:text-yellow-600";
	}
}

const incidentHexColor = (incident: IncidentEntry) => {
	switch (incident.event_type) {
		case "airport_closure": return "#ef4444";
		case "ground_stop": return "#f59e0b";
		case "ground_delay": return "#f59e0b";
		case "dual_delay": return "#f59e0b";
		case "departure_delay": return "#f59e0b";
		case "arrival_delay": return "#f59e0b";
	}
}

const incidentBorderColor = (incident: IncidentEntry) => {
	switch (incident.event_type) {
		case "airport_closure": return "border-red-400 dark:border-red-600";
		case "ground_stop": return "border-orange-400 dark:border-orange-600";
		case "ground_delay": return "border-yellow-400 dark:border-yellow-600";
		case "dual_delay": return "border-yellow-400 dark:border-yellow-600";
		case "departure_delay": return "border-yellow-400 dark:border-yellow-600";
		case "arrival_delay": return "border-yellow-400 dark:border-yellow-600";
	}
}

const incidentLocalization = (incident: IncidentEntry) => {
	switch (incident.event_type) {
		case "airport_closure": return "Airport Closure";
		case "ground_stop": return "Ground Stop";
		case "ground_delay": return "Ground Delay";
		case "dual_delay": return "Arr + Dep Delay";
		case "departure_delay": return "Departure Delay";
		case "arrival_delay": return "Arrival Delay";
	}
}

const incidentIcon = (incident: IncidentEntry, className?: string) => {
	switch (incident.event_type) {
		case "airport_closure": return <OctagonMinus className={cn("size-4", incidentColor(incident), className)} />
		case "ground_stop": return <CircleOff className={cn("size-4", incidentColor(incident), className)} />
		case "ground_delay": return <ClockAlert className={cn("size-4", incidentColor(incident), className)} />
		case "dual_delay": return <ClockAlert className={cn("size-4", incidentColor(incident), className)} />
		case "departure_delay": return <PlaneTakeoff className={cn("size-4", incidentColor(incident), className)} />
		case "arrival_delay": return <PlaneLanding className={cn("size-4", incidentColor(incident), className)} />
	}
}

const incidentDuration = (incident: IncidentEntry) => {
	if (!incident.resolved_at) return "";
	return (
		<span className="text-zinc-400 dark:text-zinc-500">
			{getLatestTimeValue(moment
				.duration(moment.utc(incident.resolved_at).diff(moment.utc(incident.observed_at)))
				.asMilliseconds(), ' ', true, 2)}
		</span>
	);
}
	
const blockColor = (entry: z.infer<typeof IncidentHistoryEntry>) => {
	switch (entry.indicator) {
		case "airport_closure": return "bg-red-400/80 dark:bg-red-400";
		case "ground_stop": return "bg-orange-400/80 dark:bg-orange-400";
		case "ground_delay": return "bg-yellow-400/80 dark:bg-yellow-400";
		case "dual_delay": return "bg-yellow-400/80 dark:bg-yellow-400";
		case "departure_delay": return "bg-yellow-400/80 dark:bg-yellow-400";
		case "arrival_delay": return "bg-yellow-400/80 dark:bg-yellow-400";
		case "normal":
		default:
			return "bg-green-400/80 dark:bg-green-400";
	}
}

const ongoingTimer = (entry: z.infer<typeof IncidentHistoryEntry>, incident: IncidentEntry, airport: AirportWithJoins) => {
	const start = localizedOrUtc(incident.observed_at, airport.timezone);
	
	// same day
	if (localizedOrUtc(entry.dt, airport.timezone).isSame(start, 'day')) return `Ongoing since ${start.format("h:mm A")}`;
	
	// spanning
	return `Ongoing since ${start.format("M/D [at] h:mm A")}`;
}

const resolutionTimer = (entry: z.infer<typeof IncidentHistoryEntry>, incident: IncidentEntry, airport: AirportWithJoins) => {
	const marker = localizedOrUtc(entry.dt, airport.timezone);
	const start = localizedOrUtc(incident.observed_at, airport.timezone);
	const end = localizedOrUtc(incident.resolved_at!, airport.timezone);
	
	// same day
	if (marker.isSame(start, 'day') && marker.isSame(end, 'day'))
		return `${start.format("h:mm A")} - ${end.format("h:mm A")}`;
	
	// starting same day
	if (marker.isSame(start, 'day'))
		return `${start.format("h:mm A")} - ${end.format("M/D [at] h:mm A")}`;
	
	// ending same day
	if (marker.isSame(end, 'day'))
		return `${start.format("M/D [at] h:mm A")} - ${end.format("h:mm A")}`;
	
	// spanning days
	return `${start.format("M/D [at] h:mm A")} - ${end.format("M/D [at] h:mm A")}`;
}

const blockTooltip = (entry: z.infer<typeof IncidentHistoryEntry>, airport: AirportWithJoins) => (
	<div className="flex flex-col space-y-2">
		<div className="font-bold px-3 py-2 border-b border-zinc-500/80 bg-zinc-800 dark:bg-zinc-200 rounded-t-lg">
			{moment.utc(entry.dt).format('MMMM Do, YYYY')}
		</div>
		
		{entry.incidents.length === 0 && (
			<div className="px-3 pb-2 flex flex-row space-x-2 items-center">
				<ClockCheck className="size-4 text-green-400 dark:text-green-600" />
				<span className="">Normal Operations</span>
			</div>
		)}
		
		{entry.incidents.length > 0 && (
			<div className="px-3 pb-2 flex flex-col space-y-3">
				{
					entry
						.incidents
						.sort((a, b) => a.observed_at.getTime() - b.observed_at.getTime())
						.map(incident => (
							<div
								key={`incidents-${incident.event_id}`}
								className={cn(
									"flex flex-col space-y-1 border-l-3",
									incident.resolved_at ? "border-solid" : "border-dashed",
									incidentBorderColor(incident)
								)}
							>
								<div className="flex flex-row space-x-2 items-center pl-2">
									{incidentIcon(incident)}
									<span className={cn("font-bold", incidentColor(incident))}>{incidentLocalization(incident)}</span>
								</div>
								<div className="flex flex-row justify-between space-x-3 pl-2">
									<div className="text-sm">
										{incident.resolved_at
											? resolutionTimer(entry, incident, airport)
											: ongoingTimer(entry, incident, airport)}
									</div>
									<div className="text-sm">{incidentDuration(incident)}</div>
								</div>
							</div>
						))
				}
			</div>
		)}
	</div>
)

const listItemTimeDisplay = (item: z.infer<typeof IncidentHistoryEntry>["incidents"][number]) => {
	const start = moment(item.observed_at);
	if (!item.resolved_at) {
		if (start.isSame(moment(), 'day')) {
			return (
				<div className="flex flex-row gap-2 items-center">
					<RssPulseIcon accentColor={incidentHexColor(item)} className="size-4"  />
					<span>{moment(item.observed_at).format('[Since] h:mm A')}</span>
				</div>
			);
		}
		
		return (
			<div className="flex flex-row gap-2 items-center">
				<RssPulseIcon accentColor={incidentHexColor(item)} className="size-4" />
				<span>{moment(item.observed_at).format('[Since] M/D/YY [at] h:mm A')}</span>
			</div>
		);
	}
	
	const end = moment(item.resolved_at);
	const duration = getLatestTimeValue(end.diff(start), " ", true, 2);

	if (start.isSame(end, 'day')) return (
		<div className="flex flex-row gap-1">
			<span className="font-semibold">{duration}</span>{"·"}
			<span>{start.format(`M/D (h:mm A`) + ` - ${end.format('h:mm A)')}`}</span>
		</div>
	);
	
	return (
		<div className="flex flex-row gap-1">
			<span className="font-semibold">{duration}</span>{"·"}
			<span>{start.format(`M/D`) + ` - ${end.format('M/D')}`}</span>
		</div>
	);
}

type HistoricalInterruptionsProps = {
	airport: AirportWithJoins;
}

export const HistoricalStatusSkeletonLoader = () => (
	<div className="border-r border-border sm:!border-b-0">
		<div className="flex flex-row px-3 py-2 justify-between">
			<div className="flex fle-row space-x-2 items-center">
				<span className="text-md font-semibold pointer-events-none">
					Historical Status
				</span>
			</div>
		</div>
		
		<div className="border-t divide-y">
			<div className="p-3">
				<Tracker
					data={Array
						.from({ length: 45 })
						.map((_, i) => ({
							color: "bg-zinc-700 dark:bg-zinc-600 animate-pulse",
							style: { animationDelay: `${i * 50}ms` }
						}))
					}
				/>
			</div>
			<div>
				<ScrollArea className="min-h-auto h-[220px]">
					<div className="flex flex-col divide-y">
						{Array(7).fill(null).map((_, i) => (
							<div
								key={`active-programs-skeleton-${i}`}
								className="group flex flex-row justify-between px-3 py-2.5 hover:bg-muted/30 transition-colors duration-300 ease-out"
							>
								<div className="flex items-center gap-2">
									<SkeletonWithDelay className="h-5 w-7 rounded-sm" delay={i * 50} />
									<SkeletonWithDelay className="h-5 w-18 rounded-sm" delay={i * 50} />
								</div>
								<div className="flex items-center space-x-3">
									<SkeletonWithDelay className="h-5 w-[30ch] rounded-sm" delay={i * 50} />
								</div>
							</div>
						))}
					</div>
				</ScrollArea>
			</div>
		</div>
	</div>
)

export const HistoricalStatus: React.FC<HistoricalInterruptionsProps> = ({ airport }) => {
	const { data, isLoading, error, refetch } = useQuery(orpc.airports.historical.incidentsByIata.queryOptions({
		input: { iata_code: airport.iata_code }
	}));
	
	if (isLoading) return <HistoricalStatusSkeletonLoader />;
	
	if (!data || error) return (
		<div className="border-r border-border sm:!border-b-0">
			<div className="flex flex-row px-3 py-2 justify-between">
				<div className="flex fle-row space-x-2 items-center">
					<span className="text-md font-semibold pointer-events-none">
						Historical Status
					</span>
				</div>
			</div>
			
			<div className="border-t">
				<ErrorSection
					title="Error loading historical status"
					className="border-t rounded-none border-solid h-[288px]"
					error={error?.message}
					refresh={refetch}
				/>
			</div>
		</div>
	);
	
	const blocks = data.map(day => ({
		color: blockColor(day),
		tooltip: blockTooltip(day, airport),
		tooltipClassname: "p-0",
	}));

	const incidents = data
		.flatMap(day => day.incidents)
		.sort((a, b) => b.observed_at.getTime() - a.observed_at.getTime());

	return (
		<div className="border-r border-border sm:!border-b-0">
			<div className="flex flex-row px-3 py-2 justify-between">
				<div className="flex fle-row space-x-2 items-center">
					<span className="text-md font-semibold pointer-events-none">
						Historical Status
					</span>
				</div>
			</div>
			
			<div className="border-t divide-y">
				<div className="p-3">
					<Tracker data={blocks} hoverEffect />
				</div>
				<div>
					<ScrollArea className="h-[240px]">
						<div className="flex flex-col divide-y">
							{!incidents.length && (
								<div className="flex justify-center items-center">
									<Empty>
										<EmptyHeader>
											<EmptyMedia>
												<div className="relative bg-green-200 dark:bg-green-700 px-2 py-2 rounded-lg">
													<Rss className="size-6 text-green-600 dark:text-green-300 -ml-0.5" />
												</div>
											</EmptyMedia>
											<EmptyTitle>No incidents</EmptyTitle>
											<EmptyDescription>
												There have been no recorded status incidents for this airport.
											</EmptyDescription>
										</EmptyHeader>
									</Empty>
								</div>
							)}
							
							{incidents.map((item, i) => (
								<motion.div
									key={`historical-event-${item.event_id}`}
									className="group flex flex-row justify-between px-3 py-2.5 hover:bg-muted/30 transition-colors duration-300 ease-out"
									initial={{ opacity: 0, y: -20 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: -20 }}
									transition={{ delay: i * (50 / 1000) }}
								>
									<div className="flex items-center gap-0.5">
										<span className="text-zinc-500 font-mono tracking-tighter text-sm ligatures align-text-top">
											{listItemTimeDisplay(item)}
										</span>
									</div>
									<div className="flex flex-row items-center gap-1.5 text-sm max-w-[40ch] truncate">
										{incidentIcon(item, "size-4")}{" "}
										{incidentLocalization(item)}
									</div>
								</motion.div>
							))}
						</div>
					</ScrollArea>
				</div>
			</div>
		</div>
	)
}