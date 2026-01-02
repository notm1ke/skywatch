import { health } from "./health";
import { statsPage } from "./stats-page";
import { trafficRouter } from "./traffic";
import { airportRouter } from "./airports";
import { airspaceRouter } from "./airspace";

export const router = {
	...airspaceRouter,
	...airportRouter,
	...trafficRouter,
	health,
	statsPage
};