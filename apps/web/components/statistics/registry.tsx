"use client";

import { useMemo, useState } from "react";
import { UsStateAbbreviations } from "~/lib/geo";
import { Squares, unitFor } from "./squares";
import { Donut, Ribbon, withOthers, type Slice } from "./distributions";

import {
	CursorTip,
	Figure,
	FigureBody,
	Note,
	Num,
	PALETTE,
	Takeaway,
	TipLine,
	TipTitle,
	useRegistry,
	type StatsRegistry
} from "./shared";

const SKY = "#38bdf8";

/** how many of a hundred */
const outOf100 = (count: number, total: number) => Math.round((count / Math.max(1, total)) * 100);

// --- when they were built -----------------------------------------------------------------------------------------

/** a bar is stacked chunks, each standing for this many aircraft: 5px a chunk, 3 of them drawn */
const CHUNK = 5;

type Hovered = { year: number; count: number; x: number; y: number };

const Age: React.FC<{ registry: StatsRegistry }> = ({ registry }) => {
	const [hovered, setHovered] = useState<Hovered | null>(null);

	const { bars, unit, peak, median, topDecade, decadeShare, first, last } = useMemo(() => {
		const counts = new Map(registry.years);
		const first = registry.years[0]?.[0] ?? 1920;
		const last = registry.years[registry.years.length - 1]?.[0] ?? first;
		const bars = Array.from({ length: last - first + 1 }, (_, index) => ({ year: first + index, count: counts.get(first + index) ?? 0 }));

		const known = registry.years.reduce((sum, [, count]) => sum + count, 0);
		const peak = bars.reduce((best, bar) => bar.count > best.count ? bar : best, bars[0]);

		// the year the middle aircraft was built
		let running = 0;
		const median = bars.find(bar => (running += bar.count) >= known / 2)?.year ?? first;

		const decades = new Map<number, number>();
		for (const bar of bars) decades.set(Math.floor(bar.year / 10) * 10, (decades.get(Math.floor(bar.year / 10) * 10) ?? 0) + bar.count);
		const [topDecade, topCount] = [...decades.entries()].sort((a, b) => b[1] - a[1])[0] ?? [first, 0];

		// a round number of aircraft per chunk, so the tallest bar is about 34 chunks
		return { bars, unit: unitFor(peak.count, 34), peak, median, topDecade, decadeShare: topCount / Math.max(1, known), first, last };
	}, [registry]);

	const height = (count: number) => (count / unit) * CHUNK;
	const tallest = height(peak.count);

	return (
		<div>
			<Takeaway>
				The middle aircraft in the registry was built in <Num>{median}</Num>. The <Num>{topDecade}s</Num> made the most that are still flying:{" "}
				<Num>{Math.round(decadeShare * 100)}%</Num>. The single biggest year is <Num>{peak.year}</Num>, with{" "}
				<Num>{peak.count.toLocaleString()}</Num> aircraft built that year still registered.
			</Takeaway>

			<div className="relative" onMouseLeave={() => setHovered(null)}>
				<div className="flex items-end gap-px" style={{ height: tallest + 4 }}>
					{bars.map(bar => (
						<div
							key={bar.year}
							onMouseMove={event => setHovered({ ...bar, x: event.clientX, y: event.clientY })}
							className="min-w-0 flex-1 transition-opacity hover:opacity-70"
							style={{
								height: bar.count ? Math.max(3, height(bar.count)) : 0,
								// stacked chunks, one for every `unit` aircraft: the bar reads as a pile of squares
								backgroundImage: `repeating-linear-gradient(to top, ${SKY} 0 ${CHUNK - 2}px, transparent ${CHUNK - 2}px ${CHUNK}px)`,
								opacity: hovered && hovered.year !== bar.year ? 0.55 : 1
							}}
						/>
					))}
				</div>

				{/* a tick every twenty years */}
				<div className="mt-1 grid h-4 gap-px text-[10px] text-muted-foreground" style={{ gridTemplateColumns: `repeat(${bars.length}, minmax(0, 1fr))` }}>
					{bars.map(bar => (
						<div key={bar.year} className="overflow-visible leading-4 whitespace-nowrap">{bar.year % 20 === 0 ? bar.year : ""}</div>
					))}
				</div>
			</div>

			<Note>
				One column per year built, {first} to {last}; each chunk is about {unit.toLocaleString()} aircraft. These are the aircraft
				still registered, so it shows how many survive, not how many were made. The {registry.unknownYear.toLocaleString()} registrations
				with no build year ({outOf100(registry.unknownYear, registry.total)}%) aren&apos;t shown.
			</Note>

			{hovered && (
				<CursorTip at={hovered}>
					<TipTitle>Built in {hovered.year}</TipTitle>
					<TipLine label="Still registered">{hovered.count.toLocaleString()}</TipLine>
				</CursorTip>
			)}
		</div>
	);
};

export const AgeFigure: React.FC = () => {
	const query = useRegistry();

	return (
		<Figure kicker="When they were built">
			<FigureBody query={query} height={320} title="Couldn't load the registry">
				{registry => <Age registry={registry} />}
			</FigureBody>
		</Figure>
	);
};

// --- who built them -----------------------------------------------------------------------------------------------

/** "CIRRUS DESIGN CORP" -> "Cirrus Design", "TEXTRON AVIATION INC" -> "Textron Aviation" */
const builderName = (name: string) => name
	.replace(/\s+(INC\.?|CORP\.?|CORPORATION|COMPANY|CO\.?|LLC|LTD\.?)$/i, "")
	.toLowerCase()
	.replace(/\b[a-z]/g, letter => letter.toUpperCase())
	.replace(/\bDji\b/, "DJI");

export const BuildersFigure: React.FC = () => {
	const query = useRegistry();

	return (
		<Figure kicker="Who built them">
			<FigureBody query={query} height={330} title="Couldn't load the registry">
				{registry => {
					const lead = registry.builders.slice(0, 3);
					const share = lead.reduce((sum, builder) => sum + builder.count, 0);

					return (
						<div>
							<Takeaway>
								{lead.map(builder => builderName(builder.name)).join(", ").replace(/, ([^,]*)$/, " and $1")} built{" "}
								<Num>{outOf100(share, registry.total)}</Num> out of every 100 registered aircraft. Most of the rest are
								built by makers too small to list.
							</Takeaway>

							<Ribbon
								total={Math.max(1, registry.total)}
								label="Registered aircraft by who built them"
								slices={withOthers(
									registry.builders.map((builder, index) => ({
										key: builder.name,
										label: builderName(builder.name),
										value: builder.count,
										color: PALETTE[index % PALETTE.length]
									})),
									Math.max(1, registry.total),
									"Everyone else"
								)}
							/>

							<Note>The whole bar is the {registry.total.toLocaleString()} currently valid registrations, split by who made the aircraft.</Note>
						</div>
					);
				}}
			</FigureBody>
		</Figure>
	);
};

// --- what kind ----------------------------------------------------------------------------------------------------

const KINDS: Record<StatsRegistry["kinds"][number]["kind"], { label: string; hint: string }> = {
	single: { label: "Single-engine airplane", hint: "Cessna 172, Piper Cherokee" },
	jet: { label: "Jet", hint: "business jets and airliners" },
	multi: { label: "Twin-engine propeller", hint: "Beech Baron, Piper Seneca" },
	helicopter: { label: "Helicopter", hint: "" },
	electric: { label: "Electric rotorcraft", hint: "mostly drones" },
	balloon: { label: "Balloon", hint: "" },
	glider: { label: "Glider", hint: "" },
	other: { label: "Something else", hint: "" }
};

export const KindsFigure: React.FC = () => {
	const query = useRegistry();

	return (
		<Figure kicker="What kind">
			<FigureBody query={query} height={330} title="Couldn't load the registry">
				{registry => {
					const count = (kind: string) => registry.kinds.find(entry => entry.kind === kind)?.count ?? 0;
					const slices: Slice[] = registry.kinds.map((entry, index) => ({
						key: entry.kind,
						label: KINDS[entry.kind].label,
						hint: KINDS[entry.kind].hint,
						value: entry.count,
						color: PALETTE[index % PALETTE.length]
					}));

					return (
						<div>
							<Takeaway>
								<Num>{outOf100(count("single"), registry.total)}</Num> out of every 100 registered aircraft are single-engine airplanes. Jets are
								only <Num>{outOf100(count("jet"), registry.total)}</Num>. And <Num>{outOf100(count("electric"), registry.total)}</Num> are not airplanes
								at all: the FAA registers large drones, like crop sprayers, as electric rotorcraft.
							</Takeaway>

							<Donut
								total={Math.max(1, registry.total)}
								slices={slices}
								label="Registered aircraft by kind"
								centerLabel="registered aircraft"
							/>

							<Note>All {registry.total.toLocaleString()} currently valid registrations, by the type the FAA files them under. Hover a kind to pick it out.</Note>
						</div>
					);
				}}
			</FigureBody>
		</Figure>
	);
};

// --- where they're registered ---------------------------------------------------------------------------------------

export const StatesFigure: React.FC = () => {
	const query = useRegistry();

	return (
		<Figure kicker="Where they're registered">
			<FigureBody query={query} height={330} title="Couldn't load the registry">
				{registry => {
					const unit = unitFor(registry.states[0]?.[1] ?? 0, 30);
					const lead = registry.states[0];

					return (
						<div>
							<Takeaway>
								{lead && (
									<>
										<Num>{UsStateAbbreviations[lead[0]] ?? lead[0]}</Num> has the most, with <Num>{lead[1].toLocaleString()}</Num> aircraft registered
										to an owner there, then {registry.states.slice(1, 3).map(([state]) => UsStateAbbreviations[state] ?? state).join(" and ")}.
									</>
								)}
							</Takeaway>

							<div>
								{registry.states.map(([state, count]) => (
									<div key={state} className="flex items-center gap-3 py-[5px]">
										<div className="w-28 shrink-0 sm:w-40">
											<div className="font-mono text-sm leading-tight font-medium">{state}</div>
											<div className="truncate text-xs leading-tight text-muted-foreground">{UsStateAbbreviations[state] ?? state}</div>
										</div>
										<Squares value={count} unit={unit} color={SKY} />
										<span className="w-14 shrink-0 text-right font-mono text-xs text-muted-foreground tabular-nums">{count.toLocaleString()}</span>
									</div>
								))}
							</div>

							<Note>Each square is about {unit.toLocaleString()} aircraft, counted by the state of the owner&apos;s address.</Note>
						</div>
					);
				}}
			</FigureBody>
		</Figure>
	);
};
