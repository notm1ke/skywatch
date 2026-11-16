import { health } from "./health";
import { statsPage } from "./stats-page";
import { planesRouter } from "./planes";
import { trafficRouter } from "./traffic";
import { airportRouter } from "./airports";
import { airspaceRouter } from "./airspace";
import { statisticsRouter } from "./statistics";

export const router = {
	...statisticsRouter,
	...airspaceRouter,
	...airportRouter,
	...trafficRouter,
	...planesRouter,
	health,
	statsPage
};