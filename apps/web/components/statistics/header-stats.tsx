import { orpc } from "~/lib/gateway";
import { LiveStatusKey } from "./live-status";
import { useQuery } from "@tanstack/react-query";
import { TopAirports, TopAirportsSkeleton } from "./top-airports";
import { TotalFlights, TotalFlightsSkeleton } from "./total-flights";
import { TotalAirports, TotalAirportsSkeleton } from "./total-airports";

export const HeaderStats = () => {
	const { data, isLoading } = useQuery(orpc.statsPage.queryOptions());
	
	if (isLoading || !data) return (
		<section className="relative w-fit">
			<div className="flex flex-col gap-y-8">
				<TotalFlightsSkeleton />
				<TopAirportsSkeleton />
			</div>
			<TotalAirportsSkeleton />
		</section>
	)
	
	return (
		<section className="relative w-fit">
			<div className="flex flex-col gap-y-8">
				<TotalFlights total={data.total} />
				<TopAirports data={data} />
			</div>
			<TotalAirports />
			<LiveStatusKey />
		</section>
	)
}