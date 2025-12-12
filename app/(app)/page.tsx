import { Metadata } from "next";
import { AirspaceTab } from "~/components/airspace";

export const metadata: Metadata = {
	description: "The US Airspace System at a glance.",
};

export default function AirspacePage() {
	return <AirspaceTab />;
} 
