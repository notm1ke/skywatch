"use client";

import Link from "next/link";

import { cn } from "cnfast";
import { orpc } from "~/lib/gateway";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { UsStateAbbreviations } from "~/lib/geo";
import { useQuery } from "@tanstack/react-query";
import { buildIndex, type TfrIndex } from "~/components/tfr/geo";
import { isNew, placeOf, typeInfo } from "~/components/tfr/types";
import { DottedMap } from "./map";

import {
	CursorTip,
	Figure,
	FigureBody,
	FigureRow,
	Note,
	Num,
	Takeaway,
	Term,
	TipHeading,
	TipText
} from "./shared";

/** the lower 48, with a little to spare: anything outside is Alaska, Hawaii or a territory and isn't on this map */
const onMap = ([lng, lat]: [number, number]) => lng > -126 && lng < -65 && lat > 23 && lat < 50.5;

type Hovered = { id: string; x: number; y: number };

const useTfrs = () => {
	const query = useQuery({ ...orpc.airspace.tfrs.overview.queryOptions(), staleTime: 60 * 1000 });
	return { query, index: useMemo(() => (query.data ? buildIndex(query.data) : null), [query.data]) };
};

/** a sentence for the busiest states: "Florida (7), California (6) and Texas (4)" */
const topStates = (tfrs: Array<{ state: string }>, take = 3) => {
	const counts = new Map<string, number>();
	// nationwide restrictions are filed under a "state" that isn't one ("USA"): it's not somewhere to be busiest
	for (const tfr of tfrs) if (UsStateAbbreviations[tfr.state] && tfr.state !== "USA") counts.set(tfr.state, (counts.get(tfr.state) ?? 0) + 1);

	const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, take);
	return top
		.map(([state, count]) => `${UsStateAbbreviations[state] ?? state} (${count})`)
		.join(", ")
		.replace(/, ([^,]*)$/, " and $1");
};

const Figures: React.FC<{ index: TfrIndex }> = ({ index }) => {
	const router = useRouter();
	const [active, setActive] = useState<string | null>(null);
	const [hovered, setHovered] = useState<Hovered | null>(null);

	const { tfrs, groups, fresh, plotted } = useMemo(() => {
		const tfrs = [...index.records.values()];
		const order = new Map(index.counts.map(([type], position) => [type, position]));

		// biggest group first, so the squares read as bands of color
		const sorted = [...tfrs].sort((a, b) => (order.get(a.type)! - order.get(b.type)!) || a.notam_id.localeCompare(b.notam_id));

		return {
			tfrs: sorted,
			groups: index.counts,
			fresh: tfrs.filter(isNew).length,
			plotted: [...index.items.values()].filter(item => onMap(item.center))
		};
	}, [index]);

	const lead = groups[0];
	const hoveredTfr = hovered ? index.records.get(hovered.id) : undefined;
	const dim = (type: string) => Boolean(active) && active !== type;

	return (
		<FigureRow>
			<Figure kicker="Restrictions in force">
				<Takeaway>
					<Num>{tfrs.length}</Num> <Term of="tfr">TFRs</Term> are in force right now.
					{lead && <> <Num>{lead[1]}</Num> of them are {typeInfo(lead[0]).label.toLowerCase()}.</>}
					{fresh > 0 && <> <Num>{fresh}</Num> are new today.</>} The most are in <Num>{topStates(tfrs)}</Num>.
				</Takeaway>

				<div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
					<div className="grid w-full max-w-56 shrink-0 grid-cols-8 gap-[3px]" onMouseLeave={() => { setActive(null); setHovered(null); }}>
						{tfrs.map(tfr => (
							<Link
								key={tfr.notam_id}
								href={`/tfrs?id=${tfr.notam_id}`}
								aria-label={`${tfr.notam_id}, ${typeInfo(tfr.type).label}, ${placeOf(tfr.description)}`}
								onMouseEnter={() => setActive(tfr.type)}
								onMouseMove={event => setHovered({ id: tfr.notam_id, x: event.clientX, y: event.clientY })}
								className={cn("aspect-square rounded-[2px] transition-opacity duration-150 hover:ring-2 hover:ring-foreground/70", dim(tfr.type) && "opacity-20")}
								style={{ background: typeInfo(tfr.type).color }}
							/>
						))}
					</div>

					<ul className="m-0 min-w-0 flex-1 list-none p-0" onMouseLeave={() => setActive(null)}>
						{groups.map(([type, count]) => {
							const info = typeInfo(type);

							return (
								<li
									key={type}
									onMouseEnter={() => setActive(type)}
									className={cn("py-1 transition-opacity duration-150", dim(type) && "opacity-40")}
								>
									<div className="flex items-center gap-2.5 text-sm">
										<span className="size-2.5 shrink-0 rounded-[2px]" style={{ background: info.color }} />
										<span className="font-medium">{info.label}</span>
										<span className="ml-auto font-mono text-xs text-muted-foreground tabular-nums">{count}</span>
									</div>
									<p className="m-0 mt-0.5 pl-5 text-xs leading-snug text-muted-foreground">{info.description}</p>
								</li>
							);
						})}
					</ul>
				</div>

				<Note>One square per restriction, grouped by what it&apos;s for. Click one to open it on the TFRs page.</Note>
			</Figure>

			<Figure kicker="Where">
				<Takeaway>
					Most are small circles around a stadium, a base or a plant, so they&apos;re shown as rings. Hover one to see what it is.
				</Takeaway>

				<div className="relative aspect-[1.8/1] w-full">
					<DottedMap interactive padding={6}>
						{layout => (
							<g>
								{plotted.map(item => {
									const point = layout.projection(item.center);
									if (!point) return null;

									const info = typeInfo(item.type);
									const lit = hovered?.id === item.id;

									return (
										<g
											key={item.id}
											onMouseEnter={() => setActive(item.type)}
											onMouseMove={event => setHovered({ id: item.id, x: event.clientX, y: event.clientY })}
											onMouseLeave={() => { setActive(null); setHovered(null); }}
											onClick={() => router.push(`/tfrs?id=${item.id}`)}
											className="cursor-pointer"
											style={{ opacity: dim(item.type) ? 0.2 : 1, transition: "opacity 150ms" }}
										>
											<circle cx={point[0]} cy={point[1]} r={lit ? 8.5 : 7} fill={info.color} fillOpacity={lit ? 0.4 : 0.22} stroke={info.color} strokeWidth={2} />
											<circle cx={point[0]} cy={point[1]} r={2.2} fill={info.color} />
										</g>
									);
								})}
							</g>
						)}
					</DottedMap>
				</div>

				<Note>
					{tfrs.length - plotted.length > 0
						? `${tfrs.length - plotted.length} of the ${tfrs.length} aren't on this map: the FAA hasn't drawn an outline for some, and some are in Alaska or Hawaii. `
						: ""}
					Colors are the same as on the TFRs page.
				</Note>
			</Figure>

			{hovered && hoveredTfr && (
				<CursorTip at={hovered} stripe={typeInfo(hoveredTfr.type).color}>
					<TipHeading code={hoveredTfr.notam_id} name={typeInfo(hoveredTfr.type).label} />
					<TipText>{placeOf(hoveredTfr.description)}, {hoveredTfr.state}</TipText>
					<TipText>Click to open it</TipText>
				</CursorTip>
			)}
		</FigureRow>
	);
};

export const TfrFigures: React.FC = () => {
	const { query, index } = useTfrs();

	// the section's own rows hold the figures, so this stands in for the whole row while it loads or fails
	if (!index) return (
		<FigureRow>
			<Figure kicker="Restrictions in force">
				<FigureBody query={{ ...query, data: undefined }} height={300} title="Couldn't load TFRs">{() => null}</FigureBody>
			</Figure>
		</FigureRow>
	);

	return <Figures index={index} />;
};
