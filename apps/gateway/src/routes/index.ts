import { airportRouter } from "./airports";
import { airspaceRouter } from "./airspace";
import { statsPage } from "./stats-page";
import { trafficRouter } from "./traffic";

export const router = {
	...airspaceRouter,
	...airportRouter,
	...trafficRouter,
	statsPage
};