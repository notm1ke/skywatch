"use client";

import moment from "moment-timezone";
import Link from "next/link";

import { cn } from "cnfast";
import { useMemo, useState } from "react";
import { STATUS } from "./live-status";

import {
	CursorTip,
	Figure,
	FigureBody,
	Note,
	Num,
	Takeaway,
	Term,
	TipHeading,
	TipText,
	formatDay,
	useReliability,
	type StatsReliability
} from "./shared";

/** One character a day from the gateway, worst thing that happened: the colors are the barcode's and the map's. */
const CODES: Record<string, { label: string; color: string } | undefined> = {
	c: { label: "Closed", color: STATUS.closure.color },
	s: { label: "Ground stop", color: STATUS.ground_stop.color },
	g: { label: "Ground delay", color: STATUS.ground_delay.color },
	d: { label: "Delays", color: "#fde68a" }
};

type Hovered = { iata: string; date: string; code: string; x: number; y: number };

const Grid: React.FC<{ data: StatsReliability }> = ({ data }) => {
	const [hovered, setHovered] = useState<Hovered | null>(null);
	const columns = `repeat(${data.days.length}, minmax(0, 1fr))`;

	// a label over the first day of each month
	const months = useMemo(
		() => data.days.map((date, index) => moment.utc(date).date() === 1 || index === 0 ? moment.utc(date).format("MMM") : ""),
		[data.days]
	);

	const top = data.airports[0];

	return (
		<div>
			<Takeaway>
				Of the <Num>{data.tracked}</Num> airports we have traffic for, <Num>{data.clean}</Num> had no closure, stop or delay at all in {data.days.length} days,
				and <Num>{data.noStops}</Num> never had a <Term of="groundStop">ground stop</Term> or a closure.
				{top && <> The {data.airports.length} below were affected most: <Num>{top.iata}</Num> on <Num>{top.affected}</Num> of the {data.days.length} days.</>}
			</Takeaway>

			<div className="grid items-center gap-y-[3px]" style={{ gridTemplateColumns: `auto minmax(0, 1fr) auto` }} onMouseLeave={() => setHovered(null)}>
				<div />
				<div className="mb-1 grid h-4 gap-px text-[10px] text-muted-foreground" style={{ gridTemplateColumns: columns }}>
					{months.map((label, index) => <div key={index} className="overflow-visible leading-4 whitespace-nowrap">{label}</div>)}
				</div>
				<div />

				{data.airports.map(airport => (
					<div key={airport.iata} className="contents">
						<Link
							href={`/airports/${airport.iata}`}
							title={airport.name}
							className="pr-3 font-mono text-sm font-medium transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
						>
							{airport.iata}
						</Link>

						<div className="grid h-5 gap-px" style={{ gridTemplateColumns: columns }}>
							{[...airport.cells].map((code, index) => {
								const entry = CODES[code];

								return (
									<div
										key={index}
										onMouseMove={event => setHovered({ iata: airport.iata, date: data.days[index], code, x: event.clientX, y: event.clientY })}
										className={cn("rounded-[1px] transition-opacity hover:opacity-70", !entry && "bg-muted/40")}
										style={entry ? { background: entry.color } : undefined}
									/>
								);
							})}
						</div>

						<span className="pl-3 text-right font-mono text-xs text-muted-foreground tabular-nums">{airport.affected} days</span>
					</div>
				))}
			</div>

			<div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
				{Object.entries(CODES).map(([code, entry]) => entry && (
					<span key={code} className="inline-flex items-center gap-1.5">
						<span className="size-2.5 rounded-[2px]" style={{ background: entry.color }} />
						{code === "g" ? <Term of="groundDelay">{entry.label}</Term> : code === "s" ? <Term of="groundStop">{entry.label}</Term> : entry.label}
					</span>
				))}
				<span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-[2px] bg-muted/60" />nothing</span>
			</div>

			<Note>
				One row per airport, one column per day, newest at the right, colored by the worst thing that day. A stripe down every row is a day the whole
				system struggled; a long run in one row is that airport alone. Click an airport to open it.
			</Note>

			{hovered && (
				<CursorTip at={hovered} stripe={CODES[hovered.code]?.color}>
					<TipHeading code={hovered.iata} name={data.airports.find(airport => airport.iata === hovered.iata)?.name} />
					<TipText>{formatDay(hovered.date)}</TipText>
					<TipText>{CODES[hovered.code]?.label ?? "Nothing recorded"}</TipText>
				</CursorTip>
			)}
		</div>
	);
};

export const ReliabilityFigure: React.FC = () => {
	const query = useReliability();

	return (
		<Figure kicker="Airport report card">
			<FigureBody query={query} height={420} title="Couldn't load the report card">
				{data => <Grid data={data} />}
			</FigureBody>
		</Figure>
	);
};
