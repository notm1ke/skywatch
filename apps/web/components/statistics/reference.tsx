"use client";

import { useMemo, useState } from "react";
import { cn } from "cnfast";
import { useAirports } from "~/components/airport-provider";
import { DottedMap } from "./map";
import { Squares, unitFor } from "./squares";

import {
	Figure,
	FigureBody,
	Note,
	Num,
	Takeaway,
	Term,
	useReference,
	type Jargon,
	type StatsReference
} from "./shared";

// --- every airport we have ------------------------------------------------------------------------------------

/** What each size of airport looks like on the map: bigger and warmer for the bigger ones, drawn smallest first. */
const SIZES = [
	{ label: "Large", color: "#38bdf8", radius: 1.0 },
	{ label: "Medium", color: "#a78bfa", radius: 0.7 },
	{ label: "Small", color: "#34d399", radius: 0.5 },
	{ label: "Other", color: "#a1a1aa", radius: 0.5 }
];

const Airports: React.FC<{ data: StatsReference }> = ({ data }) => {
	const [active, setActive] = useState<number | null>(null);
	const { airports } = useAirports();
	const tracked = airports.length;

	const counts = useMemo(() => {
		const counts = SIZES.map(() => 0);
		for (const [, , size] of data.airports) counts[size] += 1;
		return counts;
	}, [data]);

	const ordered = useMemo(() => [...data.airports].sort((a, b) => b[2] - a[2]), [data]);

	return (
		<div>
			<Takeaway>
				There are <Num>{data.counts.airports.toLocaleString()}</Num> airports on file: <Num>{counts[0]}</Num> large, <Num>{counts[1].toLocaleString()}</Num> medium
				and <Num>{counts[2].toLocaleString()}</Num> small, plus a few seaplane bases and heliports. The{" "}
				<Num>{tracked.toLocaleString()}</Num> tracked above are the ones airlines fly to.
			</Takeaway>

			<div className="relative aspect-[1.8/1] w-full">
				<DottedMap padding={6}>
					{layout => (
						<g>
							{ordered.map(([lng, lat, size], index) => {
								const point = layout.projection([lng, lat]);
								if (!point || point[0] < 0 || point[0] > layout.width || point[1] < 0 || point[1] > layout.height) return null;

								const { color, radius } = SIZES[size];

								return (
									<circle
										key={index}
										cx={point[0]}
										cy={point[1]}
										r={Math.max(1.2, layout.dot * radius * 0.8)}
										fill={color}
										fillOpacity={active === null || active === size ? 0.9 : 0.08}
										style={{ transition: "fill-opacity 150ms" }}
									/>
								);
							})}
						</g>
					)}
				</DottedMap>
			</div>

			<div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground" onMouseLeave={() => setActive(null)}>
				{SIZES.map((size, index) => counts[index] > 0 && (
					<span
						key={size.label}
						onMouseEnter={() => setActive(index)}
						className={cn("inline-flex items-center gap-1.5 transition-opacity", active !== null && active !== index && "opacity-40")}
					>
						<span className="size-2.5 rounded-full" style={{ background: size.color }} />
						{size.label}
						<span className="font-mono text-foreground tabular-nums">{counts[index].toLocaleString()}</span>
					</span>
				))}
			</div>

			<Note>Every airport in the database, by size. Alaska and Hawaii aren&apos;t on this map.</Note>
		</div>
	);
};

export const AirportsFigure: React.FC = () => {
	const query = useReference();

	return (
		<Figure kicker="Every airport we know">
			<FigureBody query={query} height={380} title="Couldn't load airports">
				{data => <Airports data={data} />}
			</FigureBody>
		</Figure>
	);
};

// --- how much of everything ---------------------------------------------------------------------------------------

// the words that need explaining get a tooltip rather than a line under them
const DATASETS: Array<{ key: keyof StatsReference["counts"]; label: string; term?: Jargon }> = [
	{ key: "waypoints", label: "Waypoints", term: "waypoint" },
	{ key: "routes", label: "Preferred routes", term: "preferredRoute" },
	{ key: "frequencies", label: "Radio frequencies", term: "frequency" },
	{ key: "runways", label: "Runways" },
	{ key: "navaids", label: "Navaids", term: "navaid" },
	{ key: "airports", label: "Airports" },
	{ key: "airways", label: "Airways", term: "airway" }
];

const SKY = "#38bdf8";

const Datasets: React.FC<{ data: StatsReference }> = ({ data }) => {
	const { counts } = data;
	const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
	// the column is narrow: fewer, bigger squares than a full-width row gets
	const unit = unitFor(counts.waypoints, 14);

	return (
		<div>
			<Takeaway>
				Behind the maps and search there are <Num>{total.toLocaleString()}</Num> records about the places and paths flying uses. The
				most are <Num>{counts.waypoints.toLocaleString()}</Num> <Term of="waypoint">waypoints</Term>.
			</Takeaway>

			<div>
				{DATASETS.map(dataset => (
					<div key={dataset.key} className="flex items-center gap-3 py-[7px]">
						<div className="w-32 shrink-0 text-sm font-medium sm:w-44">
							{dataset.term ? <Term of={dataset.term}>{dataset.label}</Term> : dataset.label}
						</div>
						<Squares value={counts[dataset.key]} unit={unit} color={SKY} />
						<span className="w-14 shrink-0 text-right font-mono text-xs text-muted-foreground tabular-nums">
							{counts[dataset.key].toLocaleString()}
						</span>
					</div>
				))}
			</div>

			<Note>Each square is about {unit.toLocaleString()} records. A partly filled square is a fraction of that.</Note>
		</div>
	);
};

export const DatasetsFigure: React.FC = () => {
	const query = useReference();

	return (
		<Figure kicker="How much there is">
			<FigureBody query={query} height={380} title="Couldn't load the data counts">
				{data => <Datasets data={data} />}
			</FigureBody>
		</Figure>
	);
};
