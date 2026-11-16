"use client";

import { CorridorsFigure } from "./corridors";
import { DisruptionsFigure, StopLeadersFigure } from "./disruptions";
import { DurationsFigure } from "./durations";
import { ReliabilityFigure } from "./reliability";
import { SeasonsFigure } from "./seasons";
import { FigureRow, StatSection, useDisruptions } from "./shared";
import { TfrFigures } from "./tfrs";

/**
 * The operations section: what stops and slows flying (ground stops, delays, closures, TFRs) and where the busiest routes
 * run. Drawn the same way as the traffic section.
 */
export const OperationsStats: React.FC = () => {
	const { data } = useDisruptions();

	return (
		<StatSection
			id="operations"
			title="Operations"
			description="What stops, slows and restricts flying across the country, and which routes are busiest."
			updated={data?.generatedAt}
		>
			{/* the barcode is 90 columns wide and wants the room; the leaderboard is a handful of rows */}
			<FigureRow className="lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
				<DisruptionsFigure />
				<StopLeadersFigure />
			</FigureRow>

			{/* the year is a chart that wants width; how long things last is a few rows */}
			<FigureRow className="lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
				<SeasonsFigure />
				<DurationsFigure />
			</FigureRow>

			<FigureRow className="lg:grid-cols-1">
				<ReliabilityFigure />
			</FigureRow>

			<TfrFigures />

			<FigureRow className="lg:grid-cols-1">
				<CorridorsFigure />
			</FigureRow>
		</StatSection>
	);
};
