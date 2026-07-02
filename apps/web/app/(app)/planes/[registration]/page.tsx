import { Metadata } from "next";
import { gateway } from "~/lib/gateway";
import { capitalizeFirst } from "~/lib/utils";
import { PlaneDetailsTab } from "~/components/planes/details";

type Params = {
	params: Promise<{
		registration: string;
	}>
}

export async function generateMetadata(
	{ params }: Params
): Promise<Metadata> {
	const { registration } = await params;
	const plane = await gateway
		.planes
		.findByRegistration({ registration })
		.catch(() => null);
	
	if (!plane) return {
		title: "Planes"
	};
	
	return {
		title: `${capitalizeFirst(plane.aircraft.manufacturer.toLowerCase())} ${plane.aircraft.model.split('-')[0]}`,
		description: `N${plane.n_number} is a ${plane.aircraft.manufacturer} ${plane.aircraft.model}.`
	}
}

export default async function PlaneInspectorPage({ params }: Params) {
	const { registration } = await params;
	return <PlaneDetailsTab registration={registration} />;
}