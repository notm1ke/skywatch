import moment from "moment-timezone";

import { z } from "zod/v4";
import { orpc } from "~/lib/gateway";
import { useQuery } from "@tanstack/react-query";
import { Tracker } from "~/components/ui/tracker";
import { cn, getLatestTimeValue } from "~/lib/utils";
import { ErrorSection } from "~/components/error-section";
import { AirportWithJoins, IncidentHistoryEntry } from "@skywatch/gateway/schemas";

import {
	CircleOff,
	ClockAlert,
	ClockCheck,
	OctagonMinus,
	PlaneLanding,
	PlaneTakeoff
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

const incidentIcon = (incident: IncidentEntry) => {
	switch (incident.event_type) {
		case "airport_closure": return <OctagonMinus className={cn("size-4", incidentColor(incident))} />
		case "ground_stop": return <CircleOff className={cn("size-4", incidentColor(incident))} />
		case "ground_delay": return <ClockAlert className={cn("size-4", incidentColor(incident))} />
		case "dual_delay": return <ClockAlert className={cn("size-4", incidentColor(incident))} />
		case "departure_delay": return <PlaneTakeoff className={cn("size-4", incidentColor(incident))} />
		case "arrival_delay": return <PlaneLanding className={cn("size-4", incidentColor(incident))} />
	}
}

const incidentDuration = (incident: IncidentEntry) => {
	if (!incident.resolved_at) return "";
	return (
		<span className="text-zinc-400 dark:text-zinc-500">
			{getLatestTimeValue(moment
				.duration(moment(incident.resolved_at).diff(moment(incident.observed_at)))
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

const blockTooltip = (entry: z.infer<typeof IncidentHistoryEntry>) => (
	<div className="flex flex-col space-y-2">
		<div className="font-bold px-3 py-2 border-b border-zinc-500/80 bg-zinc-800 dark:bg-zinc-200 rounded-t-lg">
			{moment(entry.dt).format('MMMM Do, YYYY')}
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
										{incident.resolved_at ? "" : "Ongoing since "}{moment(incident.observed_at).format('h:mm A')}
										{incident.resolved_at && <> - {moment(incident.resolved_at).format('h:mm A')}</>}
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

type HistoricalInterruptionsProps = {
	airport: AirportWithJoins;
}

export const HistoricalStatus: React.FC<HistoricalInterruptionsProps> = ({ airport }) => {
	const { data, isLoading, error, refetch } = useQuery(orpc.airports.historical.incidentsByIata.queryOptions({
		input: { iata_code: airport.iata_code }
	}));
	
	if (isLoading) return (
		<div className="border-r border-border">
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
								color: "bg-zinc-700 dark:bg-zinc-400 animate-pulse",
								style: { animationDelay: `${i * 50}ms` }
							}))
						}
					/>
				</div>
				<div className="p-3">
					
				</div>
			</div>
		</div>
	);
	
	if (!data || error) return (
		<div className="border-r border-border">
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
		tooltip: blockTooltip(day),
		tooltipClassname: "p-0",
	}))
	
	return (
		<div className="border-r border-border">
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
				<div className="p-3">
					
				</div>
			</div>
		</div>
	)
}