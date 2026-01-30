import { insights } from "./insights";
import { flightStats } from "./flight-stats";
import { cancellations } from "./cancellations";

export const trafficRouter = {
	traffic: {
		cancellations,
		flightStats,
		...insights
	}
}