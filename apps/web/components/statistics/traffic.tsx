"use client";

import { AircraftFigure, AirlinesFigure } from "./mix";
import { CancelledFigure, WhereFigure } from "./cancellations";
import { CentersFigure } from "./centers";
import { DailyFigure } from "./daily";
import { HoursFigure } from "./hours";
import { FigureRow, StatSection, useDaily } from "./shared";

/**
 * The traffic section: time as charts (a line is for a thing that changes), shares as treemaps, lollipops and ribbons,
 * counts as squares, and places on the dotted map. Every figure has a sentence that says what to see in it. Rows of two
 * split from `lg`, and the whole thing sits in the same side padding as the hero.
 */
export const TrafficStats: React.FC = () => {
	const { data } = useDaily();

	return (
		<StatSection
			id="traffic"
			title="Traffic"
			description="What the FAA's traffic feed says is flying to the busiest airports in the country. Counts are flights scheduled to land."
			updated={data?.generatedAt}
		>
			{/* ninety days wants more room than a day's twenty-four hours */}
			<FigureRow className="lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
				<DailyFigure />
				<HoursFigure />
			</FigureRow>

			<FigureRow>
				<CancelledFigure />
				<WhereFigure />
			</FigureRow>

			<FigureRow>
				<AirlinesFigure />
				<AircraftFigure />
			</FigureRow>

			<FigureRow className="lg:grid-cols-1">
				<CentersFigure />
			</FigureRow>
		</StatSection>
	);
};
