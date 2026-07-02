import { Metadata } from "next";
import { AirportsTab } from "~/components/airports";

export const metadata: Metadata = {
	title: "Airports",
	description: "Browse US airports, airline hubs, and live operational status.",
};

export default function AirportsPage() {
	return <AirportsTab />;
}
