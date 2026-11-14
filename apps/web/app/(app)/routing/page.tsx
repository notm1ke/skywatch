import { Metadata } from "next";
import { RoutingTab } from "~/components/routing";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
export const metadata: Metadata = {
	title: "Routing",
	description: "Explore FAA preferred routes between airports and ARTCCs on a map.",
};

export default async function RoutingPage() {
	return <RoutingTab />
}
