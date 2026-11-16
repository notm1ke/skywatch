"use client";

import { useMemo, useState } from "react";
import { cn } from "cnfast";
import { ROWS } from "./disruptions";

import {
	Figure,
	FigureBody,
	Note,
	Num,
	Takeaway,
	Term,
	useDurations,
	type StatsDurations
} from "./shared";

type Kind = StatsDurations["kinds"][number]["kind"];

const COLORS = Object.fromEntries(ROWS.map(row => [row.kind, row.color])) as Record<Kind, string>;
const LABELS = Object.fromEntries(ROWS.map(row => [row.kind, row.label])) as Record<Kind, string>;

/** 0.9 -> "54 min", 1 -> "1 hour", 4.2 -> "4.2 hours" */
const duration = (hours: number) => {
	if (hours < 1) return `${Math.round(hours * 60)} min`;

	const rounded = Number(hours.toFixed(1));
	return `${rounded} ${rounded === 1 ? "hour" : "hours"}`;
};

const Ranges: React.FC<{ data: StatsDurations }> = ({ data }) => {
	const [active, setActive] = useState<Kind | null>(null);

	// shortest first, so the rows read from "over in an hour" to "can last a day"
	const kinds = useMemo(() => [...data.kinds].sort((a, b) => a.median - b.median), [data]);
	const axis = Math.max(6, Math.ceil(Math.max(...kinds.map(kind => kind.p90)) / 6) * 6);
	const ticks = Array.from({ length: axis / 6 + 1 }, (_, index) => index * 6);

	const stop = data.kinds.find(kind => kind.kind === "ground_stop");
	const delay = data.kinds.find(kind => kind.kind === "ground_delay");
	const closure = data.kinds.find(kind => kind.kind === "closure");

	const label = (kind: Kind) =>
		kind === "ground_stop" ? <Term of="groundStop">{LABELS[kind]}</Term>
			: kind === "ground_delay" ? <Term of="groundDelay">{LABELS[kind]}</Term>
			: LABELS[kind];

	return (
		<div>
			<Takeaway>
				{stop && <>Half of all <Term of="groundStop">ground stops</Term> are over within <Num>{duration(stop.median)}</Num>, and nine in ten within <Num>{duration(stop.p90)}</Num>. </>}
				{delay && closure && <>Ground delays and closures run longer: half last <Num>{duration(delay.median)}</Num> and <Num>{duration(closure.median)}</Num> or more.</>}
			</Takeaway>

			<div onMouseLeave={() => setActive(null)}>
				{kinds.map(kind => (
					<div
						key={kind.kind}
						tabIndex={0}
						onMouseEnter={() => setActive(kind.kind)}
						onFocus={() => setActive(kind.kind)}
						onBlur={() => setActive(null)}
						className={cn(
							"grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-x-3 gap-y-0.5 rounded-sm py-2 outline-none transition-opacity duration-150 focus-visible:ring-2 focus-visible:ring-ring/60 sm:grid-cols-[8rem_minmax(0,1fr)]",
							active && active !== kind.kind && "opacity-40"
						)}
					>
						<div className="text-sm font-medium">{label(kind.kind)}</div>

						<div className="relative h-5">
							{/* the span from the middle one to nine in ten, and the middle one */}
							<div
								className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full"
								style={{ left: `${(kind.median / axis) * 100}%`, width: `${((kind.p90 - kind.median) / axis) * 100}%`, background: COLORS[kind.kind], opacity: 0.4 }}
							/>
							<div
								className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-background"
								style={{ left: `${(kind.median / axis) * 100}%`, background: COLORS[kind.kind] }}
							/>
						</div>

						<div className="col-start-2 font-mono text-xs text-muted-foreground tabular-nums">
							half over in {duration(kind.median)}, nine in ten in {duration(kind.p90)} · {kind.count.toLocaleString()} events
						</div>
					</div>
				))}

				{/* the hours, along the bottom */}
				<div className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-3 sm:grid-cols-[8rem_minmax(0,1fr)]">
					<div />
					<div className="relative mt-1 h-4 border-t text-[10px] text-muted-foreground">
						{ticks.map(tick => (
							<span key={tick} className="absolute top-1 -translate-x-1/2 whitespace-nowrap first:translate-x-0 last:-translate-x-full" style={{ left: `${(tick / axis) * 100}%` }}>
								{tick === 0 ? "0" : `${tick}h`}
							</span>
						))}
					</div>
				</div>
			</div>

			<Note>
				How long each kind lasts, for everything since {data.since}: the dot is the middle one (half are shorter), and the bar runs out to the point
				nine in ten are over by. Entries the FAA left open for more than three days are left out.
			</Note>
		</div>
	);
};

export const DurationsFigure: React.FC = () => {
	const query = useDurations();

	return (
		<Figure kicker="How long it lasts">
			<FigureBody query={query} height={300} title="Couldn't load durations">
				{data => <Ranges data={data} />}
			</FigureBody>
		</Figure>
	);
};
