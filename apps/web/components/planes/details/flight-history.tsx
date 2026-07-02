import moment from "moment-timezone";

import { orpc } from "~/lib/gateway";
import { motion } from "motion/react";
import { PlaneRegistration } from "@/schemas";
import { useQuery } from "@tanstack/react-query";
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
			{statusText}
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

const airportOrUnknown = (name?: string) => {
	if (!name || name === "—") return "Unknown";
	return name;
}

export const FlightHistory: React.FC<{ registration: PlaneRegistration }> = ({ registration }) => {
	const { data, isLoading, error, refetch } = useQuery(orpc.planes.flightHistory.queryOptions({
		input: { registration: registration.n_number }
	}));

	if (isLoading) return <>loading</>;
	if (error || !data) return <>error</>;

	if (!data.Flights.length) return (
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
	)
	
	return (
		<div className="flex flex-col">
			<ScrollArea className="h-[290px]">
				{data.Flights.map((flight, i) => (
					<motion.div
						key={`${flight.Flight}-${i}`}
						className="flex flex-row justify-between px-3 py-1.5 not-first:border-t"
						initial={{ opacity: 0, y: -20 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -20 }}
						transition={{ delay: i * (50 / 1000) }}
					>
						<div className="flex flex-row gap-2">
							<span className="font-semibold">{flight.Flight}</span>
							<div className="flex flex-row items-center gap-1 text-muted-foreground">
								<span className="mr-1">{moment(flight.Date).format("M/D")}</span>
								<span className="font-semibold">{airportOrUnknown(flight.From)}</span>{" "}
								<ArrowRight className="size-4" />
								<span className="font-semibold">{airportOrUnknown(flight.To)}</span>
							</div>
						</div>
						<div className="font-mono tracking-tighter">
							{statusIndicator(flight.Status)}
						</div>
					</motion.div>
				))}
			</ScrollArea>
		</div>
	)
}