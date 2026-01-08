import { Metadata } from "next";
import { WaypointsTab } from "~/components/waypoints";

export const metadata: Metadata = {
	title: "Waypoints",
	description: "Explore navigational waypoints throughout US territories.",
};

export default function WaypointsPage() {
	return <WaypointsTab />;
}