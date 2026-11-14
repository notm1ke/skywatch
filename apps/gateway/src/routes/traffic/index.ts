import { insights } from "./insights";
import { airportInsights } from "./airport";
import { flightStats } from "./flight-stats";
import { cancellations } from "./cancellations";

export const trafficRouter = {
	traffic: {
		cancellations,
		flightStats,
		airport: airportInsights,
		...insights
	}
}