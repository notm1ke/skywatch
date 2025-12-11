import { unwrap } from "~/lib/actions";
import { useEffect, useState } from "react";
import { TopAirports, TopAirportsSkeleton } from "./top-airports";
import { TotalFlights, TotalFlightsSkeleton } from "./total-flights";
import { TotalAirports, TotalAirportsSkeleton } from "./total-airports";
import { fetchTopTenAirports, TopAirportsByTraffic } from "~/lib/traffic";

export const HeaderStats = () => {
	const [data, setData] = useState<TopAirportsByTraffic | null>();
	const [loading, setLoading] = useState(true);
	
	const refresh = () => {
		fetchTopTenAirports()
			.then(unwrap)
			.then(setData)
			.catch(() => setData(null))
			.finally(() => setLoading(false));
	}
	
	useEffect(() => {
		refresh();
	}, []);
	
	if (loading || !data) return (
		<section className="lg:absolute lg:bottom-0 w-fit relative">
			<div className="flex flex-col gap-y-8">
				<TotalFlightsSkeleton />
				<TopAirportsSkeleton />
			</div>
			<TotalAirportsSkeleton />
		</section>
	)
	
	return (
		<section className="lg:absolute lg:bottom-0 w-fit relative">
			<div className="flex flex-col gap-y-8">
				<TotalFlights total={data.total} />
				<TopAirports data={data} />
			</div>
			<TotalAirports />
		</section>
	)
}