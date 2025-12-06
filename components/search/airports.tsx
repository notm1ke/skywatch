import { shortenAirportName } from "~/lib/utils";
import { UsStateAbbreviations } from "~/lib/geo";
import { AirportWithJoins } from "~/lib/airports";
import { SearchResult, SearchResultGenerator, SearchResultPredicate } from ".";

const getAirportState = (airport: AirportWithJoins) => {
	if (!airport.iso_region) return [];
	const [_, abbrev] = airport.iso_region.split("-");
	const state = UsStateAbbreviations[abbrev];	
	return [state, abbrev];
}

const getAirportLocation = (airport: AirportWithJoins) => {
	const raw = getAirportState(airport);
	if (!raw) return "United States";
	
	const [state, abbrev] = raw;
	if (!airport.municipality) return `${state}, USA`;
	return `${airport.municipality}, ${abbrev}`
}

const AirportIataIcon = ({ iata }: { iata: string }) => {
	return (
		<span className="text-zinc-800 dark:text-zinc-400 font-mono font-bold text-sm">
			{iata}
		</span>
	);
};

export type AirportMetadata = {
	iata_code?: string | null;
	icao_code?: string | null;
	name?: string | null;
	state?: string | null;
	stateAbbrev?: string | null;
	municipality?: string | null;
}

export const airportResults: SearchResultGenerator<AirportWithJoins, AirportMetadata> = (data: AirportWithJoins[]): SearchResult<AirportMetadata>[] => 
	data
		.filter(airport => airport.iata_code)
		.map(airport => ({
			id: airport.iata_code!,
			title: shortenAirportName(airport.name),
			subtitle: getAirportLocation(airport),
			href: `/airports/${airport.iata_code}`,
			icon: <AirportIataIcon iata={airport.iata_code!} />,
			type: "airport",
			metadata: {
				iata_code: airport.iata_code,
				icao_code: airport.icao_code,
				name: airport.name,
				state: getAirportState(airport).at(0),
				stateAbbrev: airport.iso_region?.split("-")[1]?.trim(),
				municipality: airport.municipality
			}
		}));

export const airportPredicates: SearchResultPredicate<AirportMetadata> = [
	(query, result) => result.metadata.iata_code?.toLowerCase()?.startsWith(query.toLowerCase()) ?? false,
	(query, result) => result.metadata.icao_code?.toLowerCase()?.startsWith(query.toLowerCase()) ?? false,
	(query, result) => result.metadata.name?.toLowerCase()?.startsWith(query.toLowerCase()) ?? false,
	(query, result) => result.metadata.municipality?.toLowerCase()?.startsWith(query.toLowerCase()) ?? false,
	(query, result) => result.metadata.state?.toLowerCase()?.startsWith(query.toLowerCase()) ?? false,
	(query, result) => result.metadata.stateAbbrev?.toLowerCase()?.startsWith(query.toLowerCase()) ?? false
]