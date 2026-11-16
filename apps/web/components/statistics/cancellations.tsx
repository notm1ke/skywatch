"use client";

import moment from "moment-timezone";
import Link from "next/link";

import { cn } from "cnfast";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Area, AreaChart, CartesianGrid, ReferenceDot, ReferenceLine, XAxis, YAxis } from "recharts";
import { useAirports } from "~/components/airport-provider";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "~/components/ui/chart";
import { Skeleton } from "~/components/ui/skeleton";
import { DottedMap } from "./map";

import {
	Figure,
	FigureBody,
	Note,
	Num,
	Takeaway,
	percent,
	useCancellations,
	useDaily,
	type StatsCancellations
} from "./shared";

const RED = "#f87171";

// --- week by week ---------------------------------------------------------------------------------------------------

const config = {
	rate: { label: "Cancelled", color: RED },
} satisfies ChartConfig;

/** Monday of the week a date is in */
const weekStart = (date: string) => moment.utc(date).startOf("isoWeek").format("YYYY-MM-DD");

const Weekly: React.FC<{ cancelled: StatsCancellations }> = ({ cancelled }) => {
	const { data: daily } = useDaily();

	const model = useMemo(() => {
		if (!daily) return null;

		const weeks = new Map<string, { flights: number; cancelled: number; days: number }>();
		for (const day of daily.days) {
			if (!day.complete) continue;
			const week = weeks.get(weekStart(day.date)) ?? { flights: 0, cancelled: 0, days: 0 };
			week.flights += day.total;
			week.cancelled += day.cancelled;
			week.days += 1;
			weeks.set(weekStart(day.date), week);
		}

		// a week with a couple of days in it says little: only full-ish ones
		const rows = [...weeks.entries()]
			.filter(([, week]) => week.days >= 5)
			.map(([week, entry]) => ({ week, rate: Math.round((entry.cancelled / entry.flights) * 1000) / 10, cancelled: entry.cancelled, flights: entry.flights }));

		const average = daily.summary.cancelRate * 100;
		const worst = rows.reduce((best, row) => row.rate > best.rate ? row : best, rows[0]);

		return { rows, average, worst, top: Math.ceil(Math.max(...rows.map(row => row.rate), average) + 0.5) };
	}, [daily]);

	const rate = cancelled.flights ? cancelled.cancelled / cancelled.flights : 0;

	return (
		<div>
			<Takeaway>
				Over the last <Num>{cancelled.days} days</Num>, <Num>{(rate * 100).toFixed(1)}</Num> out of every 100 scheduled flights were cancelled:{" "}
				<Num>{cancelled.cancelled.toLocaleString()}</Num> of <Num>{cancelled.flights.toLocaleString()}</Num>.
				{model && model.worst && <> The worst week was the one starting <Num>{moment.utc(model.worst.week).format("MMM D")}</Num>, at <Num>{model.worst.rate}%</Num>.</>}
			</Takeaway>

			{!model && <Skeleton className="h-[270px] w-full rounded-md" />}

			{model && (
				<>
					<ChartContainer config={config} className="aspect-auto h-[270px] w-full">
						<AreaChart data={model.rows} margin={{ left: 0, right: 12, top: 18 }} accessibilityLayer>
							<defs>
								<linearGradient id="cancelled-fill" x1="0" y1="0" x2="0" y2="1">
									<stop offset="0%" stopColor={RED} stopOpacity={0.35} />
									<stop offset="100%" stopColor={RED} stopOpacity={0.02} />
								</linearGradient>
							</defs>
							<CartesianGrid vertical={false} strokeDasharray="3 3" />
							<XAxis dataKey="week" tickLine={false} axisLine={false} minTickGap={28} tickFormatter={(week: string) => moment.utc(week).format("MMM D")} />
							<YAxis
								width={40}
								axisLine={false}
								tickLine={false}
								domain={[0, model.top]}
								// a tick for every whole percent while there are few of them
								ticks={Array.from({ length: model.top + 1 }, (_, value) => value).filter(value => model.top <= 6 || value % 2 === 0)}
								tickFormatter={(value: number) => `${value}%`}
							/>
							<ChartTooltip
								content={
									<ChartTooltipContent
										indicator="line"
										labelFormatter={(week: string) => `Week of ${moment.utc(week).format("MMM D")}`}
										formatter={(value, _name, item) => (
											<div className="flex w-full items-center justify-between gap-4">
												<span className="text-muted-foreground">Cancelled</span>
												<span className="font-mono font-medium tabular-nums">
													{value}% <span className="font-normal text-muted-foreground">({(item.payload as { cancelled: number }).cancelled.toLocaleString()} flights)</span>
												</span>
											</div>
										)}
									/>
								}
							/>
							<ReferenceLine
								y={model.average}
								stroke="var(--color-foreground)"
								strokeOpacity={0.4}
								strokeDasharray="4 4"
								label={{ value: `average ${model.average.toFixed(1)}%`, position: "insideBottomLeft", fontSize: 11, fill: "var(--color-muted-foreground)" }}
							/>
							<Area dataKey="rate" type="monotone" stroke={RED} strokeWidth={2.5} fill="url(#cancelled-fill)" dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
							{model.worst && (
								<ReferenceDot x={model.worst.week} y={model.worst.rate} r={5} fill={RED} stroke="var(--color-background)" strokeWidth={2} ifOverflow="visible" />
							)}
						</AreaChart>
					</ChartContainer>

					<Note>
						The share of scheduled flights cancelled each week across every airport in the feed, for the last {Math.round(daily!.days.length / 7)} weeks.
						The dashed line is the average. Weeks without at least five full days of data are left out.
					</Note>
				</>
			)}
		</div>
	);
};

export const CancelledFigure: React.FC = () => {
	const query = useCancellations();

	return (
		<Figure kicker="Cancelled">
			<FigureBody query={query} height={340} title="Couldn't load cancellations">
				{data => <Weekly cancelled={data} />}
			</FigureBody>
		</Figure>
	);
};

// --- where -----------------------------------------------------------------------------------------------------

type Worst = StatsCancellations["worst"][number];
type Bubble = { airport: Worst; rank: number; x: number; y: number; at: [number, number]; r: number };

/**
 * Airports a few miles apart land on top of each other at this scale (Teterboro and Westchester are four pixels apart),
 * so the bubbles push each other out of the way, and a thin line runs back to where each airport really is.
 */
const spread = (bubbles: Bubble[]): Bubble[] => {
	const placed = bubbles.map(bubble => ({ ...bubble }));

	for (let pass = 0; pass < 40; pass++) {
		for (let i = 0; i < placed.length; i++) {
			for (let j = i + 1; j < placed.length; j++) {
				const a = placed[i];
				const b = placed[j];
				const dx = b.x - a.x;
				const dy = b.y - a.y;
				const distance = Math.hypot(dx, dy) || 0.01;
				const wanted = a.r + b.r + 2;

				if (distance >= wanted) continue;

				const push = (wanted - distance) / 2;
				const ux = dx / distance;
				const uy = dy / distance;
				a.x -= ux * push;
				a.y -= uy * push;
				b.x += ux * push;
				b.y += uy * push;
			}
		}
	}

	return placed;
};

const Where: React.FC<{ data: StatsCancellations }> = ({ data }) => {
	const router = useRouter();
	const { airports } = useAirports();
	const [hover, setHover] = useState<string | null>(null);

	const coordinates = useMemo(
		() => new Map(airports.map(airport => [airport.iata_code, [airport.longitude_deg, airport.latitude_deg] as [number, number]])),
		[airports]
	);

	const maxRate = Math.max(0.0001, ...data.worst.map(airport => airport.rate));
	const top = data.worst[0];

	return (
		<div>
			{top && (
				<Takeaway>
					<Num>{top.iata}</Num> cancels the biggest share: <Num>{percent(top.rate)}</Num> of its flights. The numbers on the map
					rank the {data.worst.length} airports that cancel the most for their size.
				</Takeaway>
			)}

			<div className="relative aspect-[1.8/1] w-full">
				<DottedMap interactive padding={6}>
					{layout => {
						const bubbles = spread(data.worst.flatMap((airport, index) => {
							const at = coordinates.get(airport.iata);
							const point = at && layout.projection(at);
							if (!at || !point) return [];

							return [{
								airport,
								rank: index + 1,
								x: point[0],
								y: point[1],
								at,
								r: 8 + 5 * (airport.rate / maxRate)
							}];
						}));

						return (
							<g>
								{/* the real places, and a line out to each bubble */}
								{bubbles.map(({ airport, at, x, y }) => {
									const real = layout.projection(at)!;
									return (
										<g key={`${airport.iata}-real`} className="pointer-events-none">
											<line x1={real[0]} y1={real[1]} x2={x} y2={y} stroke={RED} strokeOpacity={0.6} strokeWidth={1} />
											<circle cx={real[0]} cy={real[1]} r={2} fill={RED} />
										</g>
									);
								})}

								{bubbles.map(({ airport, rank, x, y, r }) => {
									const lit = hover === airport.iata;

									return (
										<g
											key={airport.iata}
											role="link"
											tabIndex={0}
											aria-label={`${rank}. ${airport.iata}, ${airport.name}: ${percent(airport.rate)} of flights cancelled. Open the airport.`}
											onMouseEnter={() => setHover(airport.iata)}
											onMouseLeave={() => setHover(null)}
											onFocus={() => setHover(airport.iata)}
											onBlur={() => setHover(null)}
											onClick={() => router.push(`/airports/${airport.iata}`)}
											onKeyDown={event => { if (event.key === "Enter") router.push(`/airports/${airport.iata}`); }}
											className="cursor-pointer outline-none"
											style={{ opacity: hover && !lit ? 0.45 : 1, transition: "opacity 150ms" }}
										>
											<circle cx={x} cy={y} r={lit ? r + 2 : r} fill={RED} fillOpacity={lit ? 0.55 : 0.35} stroke={RED} strokeWidth={1.5} />
											<text
												x={x}
												y={y}
												textAnchor="middle"
												dominantBaseline="central"
												className="pointer-events-none fill-foreground font-mono text-[10px] font-bold"
											>
												{rank}
											</text>
										</g>
									);
								})}
							</g>
						);
					}}
				</DottedMap>
			</div>

			<ol className="m-0 mt-5 grid list-none grid-cols-1 gap-x-8 p-0 sm:grid-cols-2" onMouseLeave={() => setHover(null)}>
				{data.worst.map((airport, index) => (
					<li key={airport.iata} className="min-w-0">
						<Link
							href={`/airports/${airport.iata}`}
							onMouseEnter={() => setHover(airport.iata)}
							onFocus={() => setHover(airport.iata)}
							onBlur={() => setHover(null)}
							className={cn(
								"flex min-w-0 items-center gap-2.5 rounded-sm py-[3px] text-sm transition-[opacity,background-color] duration-150 hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none",
								hover && hover !== airport.iata && "opacity-40"
							)}
						>
							<span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-red-400/30 font-mono text-[10px] font-bold text-foreground ring-1 ring-red-400">
								{index + 1}
							</span>
							<span className="shrink-0 font-mono font-medium">{airport.iata}</span>
							<span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{airport.name}</span>
							<span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">{percent(airport.rate)}</span>
						</Link>
					</li>
				))}
			</ol>

			<Note>Only airports with at least 3,000 scheduled flights in the window, so a quiet airport can&apos;t top the list on a single cancellation. Click one to open the airport.</Note>
		</div>
	);
};

export const WhereFigure: React.FC = () => {
	const query = useCancellations();

	return (
		<Figure kicker="Where it happens">
			<FigureBody query={query} height={420} title="Couldn't load cancellations">
				{data => <Where data={data} />}
			</FigureBody>
		</Figure>
	);
};
