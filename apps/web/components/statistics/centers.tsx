"use client";

import { AirspaceLocalizations } from "@skywatch/gateway/schemas";
import { Squares, unitFor } from "./squares";

import {
	Figure,
	FigureBody,
	Note,
	Num,
	Takeaway,
	Term,
	useCenters
} from "./shared";

const EMERALD = "#34d399";


export const CentersFigure: React.FC = () => {
	const query = useCenters();

	return (
		<Figure kicker="Where it lands">
			<FigureBody query={query} height={300} title="Couldn't load centers">
				{data => {
					const unit = unitFor(data.centers[0]?.flights ?? 0);
					const lead = data.centers[0];
					const share = lead ? lead.flights / Math.max(1, data.flights) : 0;

					return (
						<div>
							<Takeaway>
								{lead && (
									<>
										<Num>{AirspaceLocalizations[lead.center] ?? lead.center}</Num> <Term of="center">Center</Term> handles the most, with{" "}
										<Num>{Math.round(share * 100)}</Num> out of every 100 landings over the last <Num>{data.days} days</Num>.
									</>
								)}
							</Takeaway>

							<div className="grid gap-x-14 lg:grid-cols-2">
								{data.centers.map(center => (
									<div key={center.center} className="flex items-center gap-3 py-[5px]">
										<div className="w-24 shrink-0 sm:w-36">
											<div className="font-mono text-sm leading-tight font-medium">{center.center}</div>
											<div className="truncate text-xs leading-tight text-muted-foreground">
												{AirspaceLocalizations[center.center] ?? center.center} · {center.airports} airports
											</div>
										</div>
										<Squares value={center.flights} unit={unit} color={EMERALD} />
										<span className="w-14 shrink-0 text-right font-mono text-xs text-muted-foreground tabular-nums">
											{center.flights.toLocaleString()}
										</span>
									</div>
								))}
							</div>

							<Note>Each square is about {unit.toLocaleString()} flights landing in the area over the last {data.days} days.</Note>
						</div>
					);
				}}
			</FigureBody>
		</Figure>
	);
};
