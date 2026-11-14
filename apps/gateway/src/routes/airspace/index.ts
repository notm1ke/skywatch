import { tfrs } from "./tfr";
import { routing } from "./routing";
import { waypoints } from "./waypoints";
import { advisories } from "./advisories";
import { historical } from "./historical";
import { interruptions } from "./interruptions";

export const airspaceRouter = {
	airspace: { advisories, historical, interruptions, routing, tfrs, waypoints }
};