import { insights } from "./insights";
import { cancellations } from "./cancellations";

export const trafficRouter = {
	traffic: {
		cancellations,
		...insights
	}
}