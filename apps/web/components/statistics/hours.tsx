"use client";

import { useMemo } from "react";
import { CartesianGrid, Line, LineChart, ReferenceDot, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "~/components/ui/chart";

import {
	Figure,
	FigureBody,
	Note,
	Num,
	Takeaway,
	hourName,
	percent,
	useHeatmap,
	type StatsHeatmap
} from "./shared";

const SKY = "#38bdf8";
const VIOLET = "#a78bfa";
const EMERALD = "#34d399";

const config = {
	weekdays: { label: "Weekdays", color: SKY },
	saturday: { label: "Saturday", color: VIOLET },
	sunday: { label: "Sunday", color: EMERALD },
} satisfies ChartConfig;

const TICKS = [0, 3, 6, 9, 12, 15, 18, 21];
/** 15 -> "3p": short enough to sit under the axis */
const hourTick = (hour: number) => `${hour % 12 === 0 ? 12 : hour % 12}${hour < 12 ? "a" : "p"}`;

const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);

const Curves: React.FC<{ heatmap: StatsHeatmap }> = ({ heatmap }) => {
	const model = useMemo(() => {
		const at = (dow: number, hour: number) => heatmap.cells.find(cell => cell.dow === dow && cell.hour === hour)?.avg ?? 0;

		// Monday to Friday are one line: they look alike, and three lines of the same color would be noise
		const rows = Array.from({ length: 24 }, (_, hour) => ({
			hour,
			weekdays: Math.round(mean([1, 2, 3, 4, 5].map(dow => at(dow, hour)))),
			saturday: at(6, hour),
			sunday: at(0, hour)
		}));

		const peakOf = (key: "weekdays" | "saturday" | "sunday") => rows.reduce((best, row) => row[key] > best[key] ? row : best, rows[0]);
		const lull = rows.reduce((best, row) => row.weekdays < best.weekdays ? row : best, rows[0]);

		return { rows, weekday: peakOf("weekdays"), saturday: peakOf("saturday"), sunday: peakOf("sunday"), lull };
	}, [heatmap]);

	const { weekday, saturday, sunday, lull } = model;
	const sundayGap = 1 - sunday.sunday / weekday.weekdays;
	const saturdayGap = 1 - saturday.saturday / weekday.weekdays;

	return (
		<div>
			<Takeaway>
				Weekdays peak at <Num>{hourName(weekday.hour)}</Num>, with about <Num>{weekday.weekdays.toLocaleString()}</Num> flights landing every hour.{" "}
				{sundayGap < 0.03
					? <>Sunday afternoons are just as busy (<Num>{sunday.sunday.toLocaleString()}</Num>), </>
					: <>Sundays peak <Num>{percent(sundayGap, 0)}</Num> lower, </>}
				while Saturdays peak <Num>{percent(saturdayGap, 0)}</Num> lower. Almost nothing lands around <Num>{hourName(lull.hour)}</Num> (<Num>{lull.weekdays}</Num> an hour).
			</Takeaway>

			<ChartContainer config={config} className="aspect-auto h-[270px] w-full">
				<LineChart data={model.rows} margin={{ left: 0, right: 12, top: 18 }} accessibilityLayer>
					<CartesianGrid vertical={false} strokeDasharray="3 3" />
					<XAxis dataKey="hour" ticks={TICKS} tickFormatter={hourTick} tickLine={false} axisLine={false} />
					<YAxis
						width={44}
						axisLine={false}
						tickLine={false}
						domain={[0, 2000]}
						ticks={[0, 500, 1000, 1500, 2000]}
						tickFormatter={(value: number) => value.toLocaleString()}
					/>
					<ChartTooltip content={<ChartTooltipContent indicator="line" labelFormatter={(hour: number) => hourName(hour)} />} />

					<Line dataKey="saturday" stroke="var(--color-saturday)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
					<Line dataKey="sunday" stroke="var(--color-sunday)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
					<Line dataKey="weekdays" stroke="var(--color-weekdays)" strokeWidth={3} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />

					<ReferenceDot
						x={weekday.hour}
						y={weekday.weekdays}
						r={5}
						fill={SKY}
						stroke="var(--color-background)"
						strokeWidth={2}
						ifOverflow="visible"
						label={{ value: `${hourName(weekday.hour)} · ${weekday.weekdays.toLocaleString()}`, position: "top", fontSize: 11, fill: "var(--color-foreground)" }}
					/>
				</LineChart>
			</ChartContainer>

			<div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
				{Object.entries(config).map(([key, entry]) => (
					<span key={key} className="inline-flex items-center gap-1.5">
						<span className="h-0.5 w-4 rounded-full" style={{ background: entry.color }} />
						{entry.label}
					</span>
				))}
			</div>

			<Note>
				Average flights landing per hour across every airport in the feed, over {heatmap.sampleDays} full days. Each airport is on its own clock,
				so 6pm is the evening rush everywhere. Weekdays are Monday to Friday averaged together.
			</Note>
		</div>
	);
};

export const HoursFigure: React.FC = () => {
	const query = useHeatmap();

	return (
		<Figure kicker="Hour by hour">
			<FigureBody query={query} height={340} title="Couldn't load the weekly pattern">
				{heatmap => <Curves heatmap={heatmap} />}
			</FigureBody>
		</Figure>
	);
};
