import aircraftDb from "~/lib/datasets/icao-aircrafts.json";

import { unrollDatum } from ".";
import { useMemo } from "react";
import { Star, StarOff } from "lucide-react";
import { useTrafficFlowPrefs } from "./store";
import { Treemap } from "~/components/ui/treemap";
import { TipLine, TipText } from "~/components/ui/cursor-tip";
import { HIGHLIGHT, colorFor } from "~/lib/chart-colors";
import { TrafficFlow } from "@skywatch/gateway/schemas";
import { ErrorSection } from "~/components/error-section";

import {
	ContextMenuItem,
	ContextMenuLabel,
	ContextMenuSeparator
} from "~/components/ui/context-menu";

const reservedKeys = ["time", "cumulative"];

const aircraftNames = new Map(aircraftDb.map(aircraft => [aircraft.icao_code.toLowerCase(), aircraft.model_name]));

/**
 * How many of the flights each type of aircraft has, as a treemap: the same one the statistics page draws. Right-click a
 * type to watch it: watched types are amber with a star and an outline, wherever they show up.
 */
export const TrafficByAircraftChart: React.FC<{ chart: TrafficFlow }> = ({ chart }) => {
	const data = unrollDatum(chart.data);
	const dataset = data[0];
	const { watchedAircraft, toggleWatchedAircraft } = useTrafficFlowPrefs();

	const slices = useMemo(() => {
		if (!dataset) return [];

		return Object.entries(dataset)
			.filter(([key]) => !reservedKeys.includes(key))
			.map(([id, value]) => ({ id, value: value as number }))
			.sort((a, b) => b.value - a.value)
			.map(({ id, value }, rank) => {
				const watched = watchedAircraft.includes(id);

				return {
					key: id,
					label: id,
					hint: aircraftNames.get(id.toLowerCase()),
					value,
					color: watched ? HIGHLIGHT : colorFor(rank),
					mark: watched ? <Star className="size-3 shrink-0 fill-current" /> : undefined,
					outlined: watched,
					tip: (
						<>
							<TipLine label="Flights">{value.toLocaleString()}</TipLine>
							{watched && <TipText>Watching</TipText>}
						</>
					)
				};
			});
	}, [dataset, watchedAircraft]);

	if (!data || data.length !== 1) return (
		<div className="w-full h-full justify-center items-center">
			<ErrorSection
				title="Something went wrong"
				error={"Received an unexpected response from the server, please try again."}
			/>
		</div>
	);

	// 234 and the padding make the 250 the card and its skeleton are drawn for
	return (
		<Treemap
			slices={slices}
			total={Math.max(1, dataset.cumulative)}
			height={234}
			className="p-2"
			shareOf="of flights"
			label="Flights by type of aircraft"
			menu={slice => {
				const watched = watchedAircraft.includes(slice.key);

				return (
					<>
						<ContextMenuLabel>{slice.hint ?? slice.key}</ContextMenuLabel>
						<ContextMenuSeparator />
						<ContextMenuItem onClick={() => toggleWatchedAircraft(slice.key)}>
							{watched ? <><StarOff /> Unwatch</> : <><Star /> Watch</>}
						</ContextMenuItem>

						{/* todo: add time-based stats via a modal + chart */}
					</>
				);
			}}
		/>
	);
}
