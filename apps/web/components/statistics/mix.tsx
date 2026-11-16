"use client";

import { Lollipops, Treemap, withOthers } from "./distributions";

import {
	Figure,
	FigureBody,
	Note,
	Num,
	PALETTE,
	Takeaway,
	TipLine,
	aircraftName,
	airlineName,
	airlineShortName,
	hasAirlineName,
	percent,
	useMix
} from "./shared";

const VIOLET = "#a78bfa";

export const AirlinesFigure: React.FC = () => {
	const query = useMix();

	return (
		<Figure kicker="Who's flying">
			<FigureBody query={query} height={380} title="Couldn't load airlines">
				{mix => {
					const lead = mix.airlines.slice(0, 4);
					const leadShare = lead.reduce((sum, airline) => sum + airline.flights, 0) / Math.max(1, mix.flights);

					const slices = withOthers(
						mix.airlines.map((airline, index) => ({
							key: airline.code,
							label: airline.code,
							hint: hasAirlineName(airline.code) ? airlineShortName(airline.code) : undefined,
							value: airline.flights,
							color: PALETTE[index % PALETTE.length],
							tip: (
								<>
									<TipLine label="Flights">{airline.flights.toLocaleString()}</TipLine>
									{airline.topAirport && <TipLine label="Lands most at">{airline.topAirport.iata}</TipLine>}
								</>
							)
						})),
						Math.max(1, mix.flights),
						"Everyone else"
					);

					return (
						<div>
							<Takeaway>
								{lead.map(airline => airlineShortName(airline.code)).join(", ").replace(/, ([^,]*)$/, " and $1")} carry{" "}
								<Num>{Math.round(leadShare * 100)}</Num> out of every 100 flights. Over the last <Num>{mix.days} days</Num>,{" "}
								<Num>{airlineName(mix.airlines[0].code)}</Num> flew the most.
							</Takeaway>

							<Treemap
								slices={slices}
								total={Math.max(1, mix.flights)}
								height={420}
								shareOf="of flights"
								label="Airlines by share of flights"
							/>

							<Note>
								Each block is an airline, sized by its share of the flights in the feed. Hover one to see where it lands most. The striped
								block is every other airline, and flights with no airline on them.
							</Note>
						</div>
					);
				}}
			</FigureBody>
		</Figure>
	);
};

export const AircraftFigure: React.FC = () => {
	const query = useMix();

	return (
		<Figure kicker="What's flying">
			<FigureBody query={query} height={380} title="Couldn't load aircraft">
				{mix => {
					const lead = mix.aircraft[0];
					const listed = mix.aircraft.reduce((sum, aircraft) => sum + aircraft.flights, 0);

					return (
						<div>
							<Takeaway>
								The <Num>{aircraftName(lead.type)}</Num> is the most common aircraft in the sky:{" "}
								<Num>{Math.round((lead.flights / Math.max(1, mix.flights)) * 100)}</Num> out of every 100 flights. The
								top ten types are about <Num>{Math.round((listed / Math.max(1, mix.flights)) * 100)}</Num> of all of them.
							</Takeaway>

							<Lollipops
								total={Math.max(1, mix.flights)}
								label="The ten most common aircraft types by share of flights"
								slices={mix.aircraft.map(aircraft => ({
									key: aircraft.type,
									label: aircraft.type,
									hint: aircraftName(aircraft.type) === aircraft.type ? undefined : aircraftName(aircraft.type),
									value: aircraft.flights,
									color: VIOLET
								}))}
							/>

							<Note>
								The ten most common types, each as its share of the flights in the feed over the last {mix.days} days
								({percent(listed / Math.max(1, mix.flights), 0)} together).
							</Note>
						</div>
					);
				}}
			</FigureBody>
		</Figure>
	);
};
