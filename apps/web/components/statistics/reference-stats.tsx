"use client";

import { AirportsFigure, DatasetsFigure } from "./reference";
import { AgeFigure, BuildersFigure, KindsFigure, StatesFigure } from "./registry";
import { FigureRow, StatSection, useRegistry } from "./shared";

/**
 * The reference section: what the app knows (airports, waypoints, routes) and the FAA's aircraft registry. Slow data: it
 * changes by the week, so it's the part of the page that's the same every time you come back.
 */
export const ReferenceStats: React.FC = () => {
	const { data } = useRegistry();

	return (
		<StatSection
			id="reference"
			title="Reference"
			description="The data behind the maps and search, and the registry of every aircraft flying under a US registration."
			updated={data?.generatedAt}
		>
			<FigureRow className="lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
				<AirportsFigure />
				<DatasetsFigure />
			</FigureRow>

			<FigureRow className="lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
				<AgeFigure />
				<BuildersFigure />
			</FigureRow>

			<FigureRow>
				<KindsFigure />
				<StatesFigure />
			</FigureRow>
		</StatSection>
	);
};
