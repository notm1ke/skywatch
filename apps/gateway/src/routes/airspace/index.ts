import { tfrs } from "./tfr";
import { waypoints } from "./waypoints";
import { advisories } from "./advisories";
import { interruptions } from "./interruptions";

export const airspaceRouter = {
	airspace: { advisories, interruptions, tfrs, waypoints }
};