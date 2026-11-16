"use client";

import moment from "moment-timezone";

import { useMemo } from "react";
import { CartesianGrid, ComposedChart, Line, ReferenceArea, ReferenceDot, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "~/components/ui/chart";

import {
	Figure,
	FigureBody,
	Note,
	Num,
	Takeaway,
	Term,
	WEEKDAYS,
	formatDay,
	percent,
	useDaily,
	type StatsDaily
} from "./shared";

const SKY = "#38bdf8";
const ROSE = "#fb7185";

/** the share of days (the roughest ones) that get a red mark */
const ROUGH_SHARE = 0.1;
/** ...as long as they were at least this bad: a calm stretch has no rough days */
const ROUGH_FLOOR = 0.02;
/** a day this far under a normal one for its weekday is called out */
const LOW_BY = 0.15;

/** Monday is 0 */
const weekdayIndex = (date: string) => (moment.utc(date).day() + 6) % 7;
const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
const shortDay = (date: string) => moment.utc(date).format("MMM D");
const thousands = (value: number) => `${Math.round(value / 1000)}k`;

const config = {
	total: { label: "Flights", color: SKY },
	average: { label: "7-day average", color: SKY },
} satisfies ChartConfig;

const Chart: React.FC<{ daily: StatsDaily }> = ({ daily }) => {
	const model = useMemo(() => {
		const days = daily.days;
		const complete = days.filter(day => day.complete);

		const weekdayMean = Array.from({ length: 7 }, (_, index) => {
			const totals = complete.filter(day => weekdayIndex(day.date) === index).map(day => day.total);
			return totals.length ? mean(totals) : 0;
		});

		// the line is the 7 days ending that day, complete days only, and needs at least four of them to say anything
		const rows = days.map((day, index) => {
			const window = days.slice(Math.max(0, index - 6), index + 1).filter(entry => entry.complete);
			return {
				date: day.date,
				total: day.complete ? day.total : null,
				average: day.complete && window.length >= 4 ? Math.round(mean(window.map(entry => entry.total))) : null
			};
		});

		const rates = complete.map(day => day.cancelled / Math.max(1, day.total)).sort((a, b) => a - b);
		const roughAt = Math.max(ROUGH_FLOOR, rates[Math.floor(rates.length * (1 - ROUGH_SHARE))] ?? 1);

		const rough = complete.filter(day => day.cancelled / Math.max(1, day.total) >= roughAt);
		const low = complete.filter(day => day.total < weekdayMean[weekdayIndex(day.date)] * (1 - LOW_BY));

		// Saturdays, with the Sunday after: shaded, so the weekly rhythm reads without a label
		const weekends = days
			.filter(day => weekdayIndex(day.date) === 5)
			.map(day => ({ from: day.date, to: days.find(entry => entry.date === moment.utc(day.date).add(1, "day").format("YYYY-MM-DD"))?.date ?? day.date }));

		const totals = complete.map(day => day.total);
		const first = complete.slice(0, 28).map(day => day.total);
		const last = complete.slice(-28).map(day => day.total);
		const overall = mean(totals);

		return {
			rows,
			rough,
			low,
			weekends,
			weekdayMean,
			overall,
			// bars start at zero, but a line doesn't have to: the axis is the range the days actually fall in
			domain: [Math.floor((Math.min(...totals) - 500) / 2000) * 2000, Math.ceil((Math.max(...totals) + 500) / 2000) * 2000] as [number, number],
			trend: mean(last) / mean(first) - 1,
			peak: weekdayMean.indexOf(Math.max(...weekdayMean)),
			quiet: weekdayMean.indexOf(Math.min(...weekdayMean.filter(Boolean)))
		};
	}, [daily]);

	const totalOf = (date: string) => daily.days.find(day => day.date === date)?.total ?? 0;
	// Monday-first index to the name
	const name = (index: number) => WEEKDAYS[(index + 1) % 7];

	const deviation = model.weekdayMean.map(value => (value ? value / model.overall - 1 : 0));
	const largest = Math.max(0.01, ...deviation.map(Math.abs));

	return (
		<div>
			<Takeaway>
				<Num>{daily.summary.averagePerDay.toLocaleString()}</Num> flights land on an average day, and the last four weeks ran{" "}
				<Num>{percent(Math.abs(model.trend), 0)}</Num> {model.trend >= 0 ? "above" : "below"} the first four. {name(model.peak)}s are the busiest day
				of the week and {name(model.quiet)}s the quietest.
			</Takeaway>

			<div className="flex flex-col gap-6 xl:flex-row xl:gap-8">
				<div className="min-w-0 flex-1">
					<ChartContainer config={config} className="aspect-auto h-[270px] w-full">
						<ComposedChart data={model.rows} margin={{ left: 0, right: 8, top: 8 }} accessibilityLayer>
							<CartesianGrid vertical={false} strokeDasharray="3 3" />
							<XAxis dataKey="date" tickLine={false} axisLine={false} minTickGap={36} tickFormatter={shortDay} />
							<YAxis
								width={40}
								axisLine={false}
								tickLine={false}
								domain={model.domain}
								// round steps: 20k, 24k, 28k, 32k rather than whatever divides the range five ways
								ticks={Array.from({ length: Math.floor((model.domain[1] - model.domain[0]) / 4000) + 1 }, (_, index) => model.domain[0] + index * 4000)}
								tickFormatter={thousands}
							/>
							<ChartTooltip content={<ChartTooltipContent indicator="line" labelFormatter={(label: string) => formatDay(label)} />} />

							{model.weekends.map(weekend => (
								<ReferenceArea key={weekend.from} x1={weekend.from} x2={weekend.to} fill="var(--color-foreground)" fillOpacity={0.05} ifOverflow="visible" />
							))}

							<Line dataKey="total" stroke="var(--color-total)" strokeWidth={1} strokeOpacity={0.55} dot={false} activeDot={{ r: 3 }} isAnimationActive={false} />
							<Line dataKey="average" stroke="var(--color-average)" strokeWidth={2.75} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />

							{model.low.map(day => (
								<ReferenceDot key={`low-${day.date}`} x={day.date} y={day.total} r={4.5} fill="none" stroke="var(--color-foreground)" strokeOpacity={0.7} strokeWidth={1.5} ifOverflow="visible" />
							))}
							{model.rough.map(day => (
								<ReferenceDot key={`rough-${day.date}`} x={day.date} y={totalOf(day.date)} r={3.5} fill={ROSE} stroke="var(--color-background)" strokeWidth={1.5} ifOverflow="visible" />
							))}
						</ComposedChart>
					</ChartContainer>

					<div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
						<span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 rounded-full" style={{ background: SKY }} />7-day average</span>
						<span className="inline-flex items-center gap-1.5"><span className="h-px w-4 opacity-60" style={{ background: SKY }} />each day</span>
						<span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: ROSE }} />rough day: among the most cancellations</span>
						<span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full border border-foreground/70" />unusually low</span>
						<span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-3 rounded-[2px] bg-foreground/10" />weekend</span>
					</div>
				</div>

				{/* the typical week: how each weekday compares with the average day */}
				<div className="shrink-0 xl:w-44">
					<div className="mb-1 font-mono text-[10px] tracking-wider text-muted-foreground uppercase">A typical week</div>
					<div className="relative h-36">
						<div className="absolute inset-x-0 top-1/2 h-px bg-border" />
						<div className="absolute inset-0 grid grid-cols-7 gap-1.5">
							{deviation.map((value, index) => {
								const height = `${(Math.abs(value) / largest) * 36}%`;
								const up = value >= 0;

								return (
									<div key={index} className="relative" title={`${name(index)}: ${up ? "+" : ""}${(value * 100).toFixed(1)}% against the average day`}>
										<div
											className="absolute inset-x-0 rounded-[2px]"
											style={{ height, background: up ? SKY : ROSE, [up ? "bottom" : "top"]: "50%" }}
										/>
										<span
											className="absolute inset-x-0 text-center text-[10px] tabular-nums text-muted-foreground"
											style={{ [up ? "bottom" : "top"]: `calc(50% + ${height} + 2px)` }}
										>
											{Math.round(Math.abs(value * 100)) === 0 ? "0" : `${up ? "+" : "−"}${Math.round(Math.abs(value * 100))}`}
										</span>
									</div>
								);
							})}
						</div>
					</div>
					<div className="grid grid-cols-7 gap-1.5 text-center text-[10px] text-muted-foreground">
						{["M", "T", "W", "T", "F", "S", "S"].map((letter, index) => <div key={index}>{letter}</div>)}
					</div>
					<div className="mt-1 text-center text-[10px] text-muted-foreground">% against the average day</div>
				</div>
			</div>

			<Note>
				Flights the FAA scheduled to land at the busiest airports, per <Term of="zulu">Zulu</Term> day, for the last {daily.days.length} days. The last
				day is left off until the feed has covered all of it. Circled days are far under a normal one for their weekday.
			</Note>
		</div>
	);
};

export const DailyFigure: React.FC = () => {
	const query = useDaily();

	return (
		<Figure kicker="Day by day">
			<FigureBody query={query} height={340} title="Couldn't load daily flights">
				{daily => <Chart daily={daily} />}
			</FigureBody>
		</Figure>
	);
};
