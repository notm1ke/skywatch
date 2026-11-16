import airlineDb from "~/lib/datasets/icao-airlines.json";

import { unrollDatum } from ".";
import { useMemo } from "react";
import { colorFor } from "~/lib/chart-colors";
import { Treemap } from "~/components/ui/treemap";
import { TipLine } from "~/components/ui/cursor-tip";
import { TrafficFlow } from "@skywatch/gateway/schemas";
import { ErrorSection } from "~/components/error-section";

const CommonAirlineLocalizations = {
	"AAL": "American",
	"SWA": "Southwest",
	"DAL": "Delta",
	"UAL": "United",
	"FDX": "FedEx",
	"ASA": "Alaska",
	"JBU": "JetBlue",
	"UPS": "UPS",
	"FFT": "Frontier Airlines",
	"AAY": "Allegiant",
	"HAL": "Hawaiian",
	"BAW": "British Airways",
	"DLH": "Lufthansa",
	"UAE": "Emirates",
	"QTR": "Qatar Airways",
	"ACA": "Air Canada",
	"AFR": "Air France",
	"KLM": "KLM",
	"ANA": "ANA",
	"THY": "Turkish",
	"CPA": "Cathay Pacific",
	"SIA": "Singapore Airlines",
	"EVA": "EVA Air",
	"ETH": "Ethiopian Airlines",
}

const reservedKeys = ["time", "cumulative"];

const airlineNames = new Map(airlineDb.map(airline => [airline.icao_code.toLowerCase(), airline.airline_name]));

/** "DAL" -> "Delta"; an airline we only have a long name for gets that; one we know nothing about is just its code */
const nameOf = (id: string) =>
	CommonAirlineLocalizations[id as keyof typeof CommonAirlineLocalizations] ?? airlineNames.get(id.toLowerCase());

// How many of the flights each airline has, as a treemap: the same one the statistics page draws.
export const TrafficByAirlineChart: React.FC<{ chart: TrafficFlow }> = ({ chart }) => {
	const data = unrollDatum(chart.data);
	const dataset = data[0];

	const slices = useMemo(() => {
		if (!dataset) return [];

		return Object.entries(dataset)
			.filter(([key]) => !reservedKeys.includes(key))
			.map(([id, value]) => ({ id, value: value as number }))
			.sort((a, b) => b.value - a.value)
			.map(({ id, value }, rank) => ({
				key: id,
				label: id,
				hint: nameOf(id),
				value,
				color: colorFor(rank),
				tip: <TipLine label="Flights">{value.toLocaleString()}</TipLine>
			}));
	}, [dataset]);

	if (!data || data.length !== 1) return (
		<div className="w-full h-full justify-center items-center">
			<ErrorSection
				title="Something went wrong"
				error={"Received an unexpected response from the server, please try again."}
			/>
		</div>
	);

	// 234 and the padding make the 250 the card and its skeleton are drawn for
	return <Treemap slices={slices} total={Math.max(1, dataset.cumulative)} height={234} className="p-2" shareOf="of flights" label="Flights by airline" />;
}
