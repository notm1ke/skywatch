"use client";

import { useState } from "react";
import { orpc } from "~/lib/gateway";
import { DateNav } from "./date-nav";
import { KpiStrip } from "./kpis";
import { DemandCard } from "./demand-chart";
import { AirlinesCard, AircraftCard, CentersCard } from "./mix";
import { FixesCard, OriginsCard, StageLengthCard } from "./origins";
import { HeatmapCard, TrendCard, TypicalDayCard } from "./patterns";
import { PlaneLanding } from "lucide-react";
import { AirportWithJoins } from "@skywatch/gateway/schemas";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "~/components/ui/empty";

const isNoData = (error: unknown) => (error as { code?: string } | null)?.code === "NO_DATA_ERROR";

/**
 * Arrival traffic analytics for one airport, from the FAA's aggregate demand feed (inbound flights only).
 * `date` is a Zulu day; undefined means the latest day we hold.
 *
 * Every row stacks on tablet/phone and splits into columns from `lg`. Cards keep their own bottom border
 * (grid items stretch, so it always sits on the row's bottom edge) and columns are divided with `lg:border-l`.
 */
export const InspectorTrafficTab: React.FC<{ airport: AirportWithJoins }> = ({ airport }) => {
	const iata = airport.iata_code;
	const timezone = airport.timezone ?? null;
	const [date, setDate] = useState<string | undefined>();
	const input = { airport: iata, date };

	const summary = useQuery({
		...orpc.traffic.airport.summary.queryOptions({ input }),
		placeholderData: keepPreviousData,
		retry: (count, error) => !isNoData(error) && count < 2
	});
	const demand = useQuery({ ...orpc.traffic.airport.demand.queryOptions({ input }), placeholderData: keepPreviousData });
	const mix = useQuery({ ...orpc.traffic.airport.mix.queryOptions({ input }), placeholderData: keepPreviousData });
	const history = useQuery({ ...orpc.traffic.airport.history.queryOptions({ input }), placeholderData: keepPreviousData });

	// airports the FAA feed doesn't cover have no rows at all
	if (!summary.data && isNoData(summary.error)) return (
		<div className="basis-full min-w-0">
			<Empty className="min-h-80">
				<EmptyHeader>
					<EmptyMedia><PlaneLanding className="size-8 text-muted-foreground" /></EmptyMedia>
					<EmptyTitle>No traffic data for {iata}</EmptyTitle>
					<EmptyDescription>
						The FAA&apos;s aggregate demand feed only covers the busiest airports. {iata} isn&apos;t included, or hasn&apos;t reported yet.
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		</div>
	);

	return (
		<div className="basis-full min-w-0">
			<DateNav summary={summary.data} requested={date} onSelect={setDate} />
			<KpiStrip query={summary} />
			<DemandCard query={demand} timezone={timezone} />

			{/* One grid so both rows share a height: `auto-rows-fr` sizes them to the tallest content, which is
			    the treemap cards (the other cards are bounded and only contribute their header). */}
			<div className="grid grid-cols-1 lg:grid-cols-3 lg:auto-rows-fr">
				<AirlinesCard iata={iata} date={date} />
				<AircraftCard iata={iata} date={date} className="lg:border-l" />
				<CentersCard iata={iata} date={date} className="lg:border-l" />

				<OriginsCard query={mix} />
				<FixesCard query={mix} className="lg:border-l" />
				<StageLengthCard query={mix} className="lg:border-l" />
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2">
				<TypicalDayCard history={history} demand={demand} />
				<HeatmapCard query={history} className="lg:border-l" />
			</div>

			<TrendCard query={history} onSelect={setDate} />
		</div>
	);
};
