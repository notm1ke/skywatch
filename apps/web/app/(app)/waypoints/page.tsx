import { Metadata } from "next";
import { WaypointsTab } from "~/components/waypoints";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
export const metadata: Metadata = {
	title: "Waypoints",
	description: "Explore navigational waypoints throughout US territories.",
};

export default function WaypointsPage() {
	return <WaypointsTab />;
}