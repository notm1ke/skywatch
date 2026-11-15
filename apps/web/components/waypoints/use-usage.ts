import { orpc } from "~/lib/gateway";
import { useQuery } from "@tanstack/react-query";

/** The airways through a waypoint and the preferred routes that use it: the panel lists them and the map draws them. */
export const useWaypointUsage = (id: string | null) => useQuery({
	...orpc.airspace.waypoints.usage.queryOptions({ input: { waypoint_id: id ?? "" } }),
	enabled: Boolean(id),
	staleTime: 10 * 60 * 1000
});
