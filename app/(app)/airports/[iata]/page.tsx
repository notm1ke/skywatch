import { Metadata } from "next";
import { unwrap } from "~/lib/actions";
import { shortenAirportName } from "~/lib/utils";
import { fetchAirportByIata } from "~/lib/airports";
import { AirportInspector } from "~/components/airport/inspect";

type Params = {
	params: Promise<{
		iata: string;
	}>
}

export async function generateMetadata(
	{ params }: Params
): Promise<Metadata> {
	const { iata } = await params;
	const airport = await fetchAirportByIata(iata)
		.then(unwrap)
		.catch(() => null);
	
	if (!airport) return {
		title: "Airports"
	};
	
	const [_, state] = airport.iso_region!.split("-");
	const size = airport.type.split("_")[0];
	return {
		title: airport.iata_code,
		description: `${shortenAirportName(airport.name)} is a ${size} airport in ${airport.municipality}, ${state}.`
	}
}

export default async function AirportPage({ params }: Params) {
	const { iata } = await params;
	// todo: transition to full server component
	// const [airport, rvr] = await Promise.all([
	// 	fetchAirportByIata(iata),
	// 	fetchRvrForAirport(iata)
	// ]);
	
	return (
		<AirportInspector iata={iata} />
	);
} 
