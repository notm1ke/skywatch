import moment from "moment-timezone";

import { orpc } from "~/lib/gateway";
import { motion } from "motion/react";
import { PlaneRegistration } from "@/schemas";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "~/components/ui/badge";
import { ScrollArea } from "~/components/ui/scroll-area";

import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle
} from "~/components/ui/empty";

import {
	ArrowRight,
	CircleAlert,
	ClockCheck,
	Plane,
	PlaneLanding,
	PlaneTakeoff,
	Split
} from "lucide-react";

const statusIndicator = (statusText: string) => {
	if (statusText === "Canceled") return (
		<div className="flex flex-row items-center gap-2">
			<CircleAlert className="size-4 text-red-500 dark:text-red-400" />
			Cancelled
		</div>
	);

	if (statusText.startsWith("Diverted")) return (
		<div className="flex flex-row items-center gap-2">
			<Split className="size-4 text-red-500 dark:text-red-400" />
			Diverted
		</div>
	)

	if (statusText.startsWith("Landed")) return (
		<div className="flex flex-row items-center gap-2">
			<PlaneLanding className="size-4 text-green-500 dark:text-green-400" />
			{statusText}
		</div>
	);

	if (statusText.startsWith("Estimated departure")) return (
		<div className="flex flex-row items-center gap-2">
			<PlaneTakeoff className="size-4 text-blue-500 dark:text-blue-400" />
			{statusText.replace("Estimated departure", "Est. departure")}
		</div>
	);
	
	if (statusText.startsWith("Estimated")) return (
		<div className="flex flex-row items-center gap-2">
			<ClockCheck className="size-4 text-green-500 dark:text-green-400" />
			{statusText}
		</div>
	);

	return statusText;
}

const statusBadge = (statusText: string) => {
	if (statusText === "Canceled") return (
		<Badge variant="red" className="gap-1 font-mono font-normal">
			<CircleAlert className="size-3" />
			Cancelled
		</Badge>
	);

	if (statusText.startsWith("Diverted")) return (
		<Badge variant="red" className="gap-1 font-mono font-normal">
			<Split className="size-3" />
			Diverted
		</Badge>
	);

	if (statusText.startsWith("Landed")) return (
		<Badge variant="green" className="gap-1 font-mono font-normal">
			<PlaneLanding className="size-3" />
			{statusText.replace("Landed", "").trim()}
		</Badge>
	);

	if (statusText.startsWith("Estimated departure")) return (
		<Badge variant="blue" className="gap-1 font-mono font-normal">
			<PlaneTakeoff className="size-3" />
			{statusText.replace("Estimated departure", "").trim()}
		</Badge>
	);

	if (statusText.startsWith("Estimated")) return (
		<Badge variant="green" className="gap-1 font-mono font-normal">
			<ClockCheck className="size-3" />
			{statusText.replace("Estimated", "").trim()}
		</Badge>
	);

	return <Badge variant="secondary" className="font-mono font-normal">{statusText}</Badge>;
}

const airportOrUnknown = (name?: string) => {
	if (!name || name === "—") return "Unknown";
	return name;
}

export const FlightHistory: React.FC<{ registration: PlaneRegistration }> = ({ registration }) => {
	const { data, isLoading, error, refetch } = useQuery(orpc.planes.flightHistory.queryOptions({
		input: { registration: registration.n_number }
	}));

	return (
		<div>
			<div className="flex flex-row px-3 py-2 justify-between">
				<div className="flex flex-row space-x-2 items-center">
					<span className="text-md font-semibold pointer-events-none">
						Flight History
					</span>
				</div>
			</div>

			<div className="border-t">
				{isLoading && <>loading</>}

				{!isLoading && (error || !data) && <>error</>}

				{!isLoading && data && !data.Flights.length && (
					<div className="flex items-center justify-center">
						<Empty>
							<EmptyHeader>
								<EmptyMedia>
									<div className="relative bg-red-200 dark:bg-red-700 px-2 py-2 rounded-lg">
										<Plane className="size-6 text-red-600 dark:text-red-300 rotate-45 -ml-0.5" />
										<div className="absolute inset-0 flex items-center justify-center">
											<div className="w-8 h-0.5 bg-red-600 dark:bg-red-300 rotate-45" />
										</div>
									</div>
								</EmptyMedia>
								<EmptyTitle>No flights</EmptyTitle>
								<EmptyDescription>
									There are no recorded flights for this aircraft.
								</EmptyDescription>

								<EmptyContent>
								</EmptyContent>
							</EmptyHeader>
						</Empty>
					</div>
				)}

				{!isLoading && data && data.Flights.length > 0 && (
					<ScrollArea className="h-[290px]">
						{data.Flights.map((flight, i) => (
							<motion.div
								key={`${flight.Flight}-${i}`}
								className="flex flex-col gap-1 px-3 py-2 not-first:border-t sm:flex-row sm:items-center sm:justify-between sm:gap-2 sm:py-1.5"
								initial={{ opacity: 0, y: -20 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -20 }}
								transition={{ delay: i * (50 / 1000) }}
							>
								<div className="flex sm:hidden flex-row items-center justify-between gap-2">
									<div className="min-w-0">
										<div className="flex flex-row items-center gap-1 text-sm">
											<span className="font-semibold truncate">{airportOrUnknown(flight.From)}</span>
											<ArrowRight className="size-4 shrink-0 text-muted-foreground" />
											<span className="font-semibold truncate">{airportOrUnknown(flight.To)}</span>
										</div>
										<div className="flex flex-row items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
											<span className="font-semibold text-foreground">{flight.Flight}</span>
											<span>·</span>
											<span>{moment(flight.Date).format("M/D")}</span>
										</div>
									</div>
									<div className="shrink-0">
										{statusBadge(flight.Status)}
									</div>
								</div>

								<div className="hidden sm:flex flex-row gap-2">
									<span className="font-semibold">{flight.Flight}</span>
									<div className="flex flex-row items-center gap-1 text-muted-foreground">
										<span className="mr-1">{moment(flight.Date).format("M/D")}</span>
										<span className="font-semibold">{airportOrUnknown(flight.From)}</span>{" "}
										<ArrowRight className="size-4" />
										<span className="font-semibold">{airportOrUnknown(flight.To)}</span>
									</div>
								</div>
								<div className="hidden sm:block font-mono tracking-tighter">
									{statusIndicator(flight.Status)}
								</div>
							</motion.div>
						))}
					</ScrollArea>
				)}
			</div>
		</div>
	)
}