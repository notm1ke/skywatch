"use client";

import Link from "next/link";

import { cn } from "cnfast";
import { ArrowLeftRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { shortenAirportName } from "~/lib/utils";
import { useAirports } from "~/components/airport-provider";
import { DottedMap } from "./map";

import {
	CursorTip,
	Figure,
	FigureBody,
	Note,
	Num,
	Takeaway,
	TipHeading,
	TipLine,
	TipText,
	useCorridors,
	type StatsCorridors
} from "./shared";

type Pair = StatsCorridors["pairs"][number];

const key = ([a, b]: Pair) => `${a}-${b}`;

/** the routing page, set to the pair in both directions: the corridor counts flights both ways */
const routesHref = ([a, b]: Pair) => `/routing?from=airport:${a}&to=airport:${b}&both=1`;

/** How many show in the list beside the map */
const LISTED = 10;

type Hovered = { pair: Pair; x: number; y: number };

const Corridors: React.FC<{ data: StatsCorridors }> = ({ data }) => {
	const router = useRouter();
	const { airports } = useAirports();
	const [hover, setHover] = useState<string | null>(null);
	const [cursor, setCursor] = useState<Hovered | null>(null);

	const where = useMemo(() => new Map(airports.map(airport => [airport.iata_code, {
		at: [airport.longitude_deg, airport.latitude_deg] as [number, number],
		name: shortenAirportName(airport.name)
	}])), [airports]);

	const max = data.pairs[0]?.[2] ?? 1;
	const lead = data.pairs[0];
	const carried = data.pairs.reduce((sum, pair) => sum + pair[2], 0);
	const name = (iata: string) => where.get(iata)?.name ?? iata;

	return (
		<div className="grid gap-x-14 gap-y-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
			<div className="min-w-0">
				<Takeaway>
					{lead && (
						<>
							<Num>{lead[0]} and {lead[1]}</Num> are the busiest pair of airports: <Num>{lead[2].toLocaleString()}</Num> flights
							between them in <Num>{data.days} days</Num>, in both directions. The {data.pairs.length} busiest corridors carry{" "}
							<Num>{Math.round((carried / Math.max(1, data.flights)) * 100)}</Num> out of every 100 flights in the feed.
						</>
					)}
				</Takeaway>

				<div className="relative aspect-[1.8/1] w-full">
					<DottedMap interactive padding={6}>
						{layout => {
							const drawn = data.pairs.flatMap(pair => {
								const from = where.get(pair[0]);
								const to = where.get(pair[1]);
								const p = from && layout.projection(from.at);
								const q = to && layout.projection(to.at);

								// a pair with an end in Alaska or Hawaii would run off the edge of a map of the lower 48
								const inside = (point: [number, number] | null | undefined) =>
									Boolean(point && point[0] > 0 && point[0] < layout.width && point[1] > 0 && point[1] < layout.height);

								return inside(p) && inside(q) ? [{ pair, p: p!, q: q! }] : [];
							});

							// the thinnest first, so the busy corridors end up on top
							const ordered = [...drawn].sort((a, b) => a.pair[2] - b.pair[2]);
							const ends = new Map<string, [number, number]>();
							for (const { pair, p, q } of drawn) {
								ends.set(pair[0], p);
								ends.set(pair[1], q);
							}

							return (
								<g>
									{ordered.map(({ pair, p, q }) => {
										const lit = hover === key(pair);
										const [dx, dy] = [q[0] - p[0], q[1] - p[1]];
										const length = Math.hypot(dx, dy) || 1;

										// an arc, bowed toward the north so the routes read as flights rather than as a web of straight lines
										let [nx, ny] = [dy / length, -dx / length];
										if (ny > 0) [nx, ny] = [-nx, -ny];
										// shallow, and never up past the top of the map
										const bow = Math.min(length * 0.12, 36);
										const control = [(p[0] + q[0]) / 2 + nx * bow, Math.max(4, (p[1] + q[1]) / 2 + ny * bow)];
										const d = `M ${p[0]} ${p[1]} Q ${control[0]} ${control[1]} ${q[0]} ${q[1]}`;

										return (
											<g
												key={key(pair)}
												role="link"
												tabIndex={0}
												aria-label={`${pair[0]} and ${pair[1]}: ${pair[2].toLocaleString()} flights in ${data.days} days. Open the routes between them.`}
												onMouseEnter={() => setHover(key(pair))}
												onMouseMove={event => setCursor({ pair, x: event.clientX, y: event.clientY })}
												onMouseLeave={() => { setHover(null); setCursor(null); }}
												onFocus={() => setHover(key(pair))}
												onBlur={() => setHover(null)}
												onClick={() => router.push(routesHref(pair))}
												onKeyDown={event => { if (event.key === "Enter") router.push(routesHref(pair)); }}
												className="cursor-pointer outline-none"
												style={{ opacity: hover && !lit ? 0.12 : 1, transition: "opacity 150ms" }}
											>
												<path
													d={d}
													fill="none"
													stroke={lit ? "#38bdf8" : "var(--color-foreground)"}
													strokeOpacity={lit ? 1 : 0.42}
													strokeWidth={0.8 + 3 * Math.sqrt(pair[2] / max)}
													strokeLinecap="round"
												/>
												{/* a fatter, invisible stroke to point at */}
												<path d={d} fill="none" stroke="transparent" strokeWidth={10} />
											</g>
										);
									})}

									{[...ends.entries()].map(([iata, point]) => (
										<circle key={iata} cx={point[0]} cy={point[1]} r={2.5} fill="var(--color-foreground)" fillOpacity={0.85} className="pointer-events-none" />
									))}
								</g>
							);
						}}
					</DottedMap>
				</div>

				<Note>
					Each arc joins two airports, thicker for more flights between them in either direction. Flights are counted as they land
					at the airports in the feed over the last {data.days} days. Routes to Alaska and Hawaii are left off the map. Click an arc or a
					pair to see the routes between them.
				</Note>
			</div>

			<div className="min-w-0">
				<h4 className="my-0 mb-2 font-mono text-xs font-medium tracking-wider text-muted-foreground uppercase">Busiest pairs</h4>
				<ol className="m-0 list-none p-0" onMouseLeave={() => setHover(null)}>
					{data.pairs.slice(0, LISTED).map((pair, index) => (
						<li key={key(pair)}>
							<Link
								href={routesHref(pair)}
								onMouseEnter={() => setHover(key(pair))}
								onFocus={() => setHover(key(pair))}
								onBlur={() => setHover(null)}
								className={cn(
									"flex items-center gap-2.5 rounded-sm py-[5px] text-sm transition-[opacity,background-color] duration-150 hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none",
									hover && hover !== key(pair) && "opacity-40"
								)}
							>
								<span className="w-5 shrink-0 text-right font-mono text-xs text-muted-foreground">{index + 1}</span>
								<span className="flex shrink-0 items-center gap-1.5 font-mono font-medium">
									{pair[0]}
									<ArrowLeftRight className="size-3 text-muted-foreground" />
									{pair[1]}
								</span>
								<span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{name(pair[0])} · {name(pair[1])}</span>
								<span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">{pair[2].toLocaleString()}</span>
							</Link>
						</li>
					))}
				</ol>
			</div>

			{cursor && (
				<CursorTip at={cursor}>
					<TipHeading code={`${cursor.pair[0]} ↔ ${cursor.pair[1]}`} />
					<TipText>{name(cursor.pair[0])} and {name(cursor.pair[1])}</TipText>
					<TipLine label="Flights">{cursor.pair[2].toLocaleString()}</TipLine>
					<TipLine label="A day">about {Math.round(cursor.pair[2] / data.days)}</TipLine>
					<TipText>Click to see the routes</TipText>
				</CursorTip>
			)}
		</div>
	);
};

export const CorridorsFigure: React.FC = () => {
	const query = useCorridors();

	return (
		<Figure kicker="Busiest corridors">
			<FigureBody query={query} height={380} title="Couldn't load corridors">
				{data => <Corridors data={data} />}
			</FigureBody>
		</Figure>
	);
};
