"use client";

import moment from "moment-timezone";
import Link from "next/link";

import { cn } from "cnfast";
import { useMemo, useState } from "react";
import { Squares, unitFor } from "./squares";
import { STATUS } from "./live-status";

import {
	CursorTip,
	Figure,
	FigureBody,
	Note,
	Num,
	Takeaway,
	Term,
	TipLine,
	TipTitle,
	formatDay,
	useDisruptions,
	type StatsDisruptions
} from "./shared";

type Kind = "closure" | "ground_stop" | "ground_delay" | "delay";
type Day = StatsDisruptions["days"][number];

/** The same colors as the rings on the map, with the delays a paler yellow so the two yellow rows can be told apart. */
export const ROWS: Array<{ kind: Kind; label: string; color: string }> = [
	{ kind: "closure", label: "Closed", color: STATUS.closure.color },
	{ kind: "ground_stop", label: "Ground stop", color: STATUS.ground_stop.color },
	{ kind: "ground_delay", label: "Ground delay", color: STATUS.ground_delay.color },
	{ kind: "delay", label: "Delays", color: "#fde68a" }
];

type Hovered = { day: Day; x: number; y: number };

// --- the barcode ------------------------------------------------------------------------------------------------

const Timeline: React.FC<{ data: StatsDisruptions }> = ({ data }) => {
	const [hovered, setHovered] = useState<Hovered | null>(null);

	const { maxes, worst, worstTotal, labels } = useMemo(() => {
		// each row has its own scale: there are far more delays than closures, and on one scale the closures would vanish
		const maxes = Object.fromEntries(ROWS.map(row => [row.kind, Math.max(1, ...data.days.map(day => day[row.kind]))])) as Record<Kind, number>;
		const total = (day: Day) => day.closure + day.ground_stop + day.ground_delay + day.delay;
		const worst = data.days.reduce((best, day) => total(day) > total(best) ? day : best, data.days[0]);

		// a label above the first day of each month (and the first column)
		const labels = data.days.map((day, index) => moment.utc(day.date).date() === 1 || index === 0 ? moment.utc(day.date).format("MMM") : "");

		return { maxes, worst, worstTotal: total(worst), labels };
	}, [data]);

	const columns = `repeat(${data.days.length}, minmax(0, 1fr))`;

	return (
		<div className="flex flex-1 flex-col">
			<Takeaway>
				<Num>{moment.utc(worst.date).format("MMM D")}</Num> was the worst day, with <Num>{worstTotal}</Num> closures, stops and delays
				starting. Over <Num>{data.days.length} days</Num> there were <Num>{data.totals.ground_stop.toLocaleString()}</Num>{" "}
				<Term of="groundStop">ground stops</Term>, <Num>{data.totals.ground_delay.toLocaleString()}</Num>{" "}
				<Term of="groundDelay">ground delays</Term> and <Num>{data.totals.closure.toLocaleString()}</Num> closures.
			</Takeaway>

			{/* the rows share whatever height the figure beside it has, so the two line up */}
			<div className="flex min-h-40 flex-1 gap-2">
				<div className="flex flex-col gap-[3px] pt-5 text-[10px] text-muted-foreground">
					{ROWS.map(row => (
						<div key={row.kind} className="flex min-h-6 flex-1 items-center justify-end whitespace-nowrap">
							{row.kind === "ground_stop" ? <Term of="groundStop">{row.label}</Term>
								: row.kind === "ground_delay" ? <Term of="groundDelay">{row.label}</Term>
								: row.label}
						</div>
					))}
				</div>

				<div className="flex min-w-0 flex-1 flex-col" onMouseLeave={() => setHovered(null)}>
					<div className="mb-1 grid h-4 gap-px text-[10px] text-muted-foreground sm:gap-[2px]" style={{ gridTemplateColumns: columns }}>
						{labels.map((label, index) => <div key={index} className="overflow-visible leading-4 whitespace-nowrap">{label}</div>)}
					</div>

					<div className="flex flex-1 flex-col gap-[3px]">
						{ROWS.map(row => (
							<div key={row.kind} className="grid min-h-6 flex-1 gap-px sm:gap-[2px]" style={{ gridTemplateColumns: columns }}>
								{data.days.map(day => {
									const n = day[row.kind];
									const strength = n / maxes[row.kind];

									return (
										<div
											key={day.date}
											onMouseMove={event => setHovered({ day, x: event.clientX, y: event.clientY })}
											className={cn("rounded-[1px] transition-opacity hover:opacity-70", n === 0 && "bg-muted/40")}
											style={n > 0 ? { background: `color-mix(in oklab, ${row.color} ${Math.round(25 + 75 * strength)}%, var(--color-muted))` } : undefined}
										/>
									);
								})}
							</div>
						))}
					</div>
				</div>
			</div>

			<Note>
				One column per day, the last {data.days.length} days, newest at the right. A square is darker the more of that kind began that
				day, compared with that row&apos;s own busiest day.
			</Note>

			{hovered && (
				<CursorTip at={hovered}>
					<TipTitle>{formatDay(hovered.day.date)}</TipTitle>
					{ROWS.map(row => (
						<TipLine key={row.kind} label={row.label}>{hovered.day[row.kind]}</TipLine>
					))}
				</CursorTip>
			)}
		</div>
	);
};

export const DisruptionsFigure: React.FC = () => {
	const query = useDisruptions();

	return (
		<Figure kicker="Stopped and slowed" className="flex flex-col">
			<FigureBody query={query} height={260} title="Couldn't load disruptions">
				{data => <Timeline data={data} />}
			</FigureBody>
		</Figure>
	);
};

// --- who's stopped longest --------------------------------------------------------------------------------------

const StopLeaders: React.FC<{ data: StatsDisruptions }> = ({ data }) => {
	const { stops } = data;
	const color = STATUS.ground_stop.color;
	const unit = unitFor(stops.airports[0]?.hours ?? 0, 30);

	const total = stops.count * stops.averageHours;
	const leaders = stops.airports.reduce((sum, airport) => sum + airport.hours, 0);
	const lead = stops.airports[0];

	return (
		<div>
			<Takeaway>
				{lead ? (
					<>
						<Num>{lead.name.replace(/ (International|Airport|Intl).*$/, "")}</Num> has spent <Num>{lead.hours} hours</Num> under a{" "}
						<Term of="groundStop">ground stop</Term> in <Num>{data.days.length} days</Num>, across <Num>{lead.count}</Num> stops. The eight
						airports below account for <Num>{total ? Math.round((leaders / total) * 100) : 0}%</Num> of all ground-stop hours, and a typical
						stop lasts <Num>{stops.averageHours} hours</Num>.
					</>
				) : "No ground stops in this window."}
			</Takeaway>

			<div>
				{stops.airports.map(airport => (
					<Link
						key={airport.iata}
						href={`/airports/${airport.iata}`}
						className="flex items-center gap-3 rounded-sm py-[5px] transition-colors hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
					>
						<div className="w-24 shrink-0 sm:w-40">
							<div className="font-mono text-sm leading-tight font-medium">{airport.iata}</div>
							<div className="truncate text-xs leading-tight text-muted-foreground">{airport.name}</div>
						</div>
						<Squares value={airport.hours} unit={unit} color={color} />
						<span className="w-16 shrink-0 text-right font-mono text-xs text-muted-foreground tabular-nums">{airport.hours} hrs</span>
					</Link>
				))}
			</div>

			<Note>
				Each square is about {unit} hours with a ground stop in effect, added up over every stop. Stops the FAA left open for more than
				two days are left out as stale entries. Click an airport to open it.
			</Note>
		</div>
	);
};

export const StopLeadersFigure: React.FC = () => {
	const query = useDisruptions();

	return (
		<Figure kicker="Stopped the longest">
			<FigureBody query={query} height={260} title="Couldn't load disruptions">
				{data => <StopLeaders data={data} />}
			</FigureBody>
		</Figure>
	);
};
