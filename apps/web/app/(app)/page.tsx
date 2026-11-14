import { Metadata } from "next";
import { AirspaceTab } from "~/components/airspace";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
export const metadata: Metadata = {
	description: "The US Airspace System at a glance.",
};

export default function AirspacePage() {
	return <AirspaceTab />;
} 
