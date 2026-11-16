"use client";

import { cn } from "cnfast";
import { ReactNode, useMemo, useState } from "react";
import { hierarchy, treemap, treemapSquarify } from "d3-hierarchy";
import { useBoxSize } from "~/hooks/use-box-size";
import { OTHERS } from "~/lib/chart-colors";
import { CursorTip, TipHeading, TipText } from "./cursor-tip";
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from "./context-menu";

/** One part of a whole: an airline, a kind of aircraft. */
export type TreemapSlice = {
	key: string;
	/** the mono code in its block */
	label: string;
	/** a muted name after it, in the blocks big enough and in the tooltip */
	hint?: string;
	value: number;
	color: string;
	/** what the tooltip says under its title */
	tip?: ReactNode;
	/** something to put before the label, like a star on a watched aircraft */
	mark?: ReactNode;
	/** an outline around the block: the slice is one the person picked out (the color alone could be mistaken for a rank) */
	outlined?: boolean;
};

/** a slice for everything not listed: gray and striped, whatever the palette */
export const STRIPES = "repeating-linear-gradient(135deg, rgb(113 113 122 / 0.38) 0 6px, rgb(113 113 122 / 0.22) 6px 12px)";
export const OTHER_KEY = "__others";

/** adds a striped "everyone else" slice for whatever the slices don't add up to */
export const withOthers = (slices: TreemapSlice[], total: number, label: string): TreemapSlice[] => {
	const rest = total - slices.reduce((sum, slice) => sum + slice.value, 0);
	return rest > 0 ? [...slices, { key: OTHER_KEY, label, value: rest, color: OTHERS }] : slices;
};

const percent = (fraction: number, digits = 1) => `${(fraction * 100).toFixed(digits)}%`;

/** Where an element is on the screen, for a tooltip when it was reached by keyboard rather than by the pointer. */
const centerOf = (element: Element) => {
	const box = element.getBoundingClientRect();
	return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
};

type Pointed = { key: string; x: number; y: number };
type TreeDatum = Partial<TreemapSlice> & { children?: TreemapSlice[] };

type Props = {
	slices: TreemapSlice[];
	/** what the shares are of */
	total: number;
	height?: number;
	/** what a screen reader is told it is */
	label: string;
	/** around the treemap: room to breathe, or a margin */
	className?: string;
	/** a right-click menu for a block; without it there isn't one */
	menu?: (slice: TreemapSlice) => ReactNode;
	/** what the shares are of, for the tooltip: "23.6% of flights" */
	shareOf?: string;
};

/**
 * A treemap: each part is a block sized by its share, colored by the slice's own color. It measures the box it's in and
 * lays out to fit it. Pointing at (or tabbing to) a block picks it out and dims the rest, with a tooltip that follows
 * the pointer. Shared by the airspace and airport traffic charts and the statistics page.
 */
export const Treemap: React.FC<Props> = ({ slices, total, height = 340, label, className, menu, shareOf = "of the total" }) => {
	const [ref, size] = useBoxSize();
	const [pointed, setPointed] = useState<Pointed | null>(null);
	const [menuKey, setMenuKey] = useState<string | null>(null);

	const cells = useMemo(() => {
		if (!size || size.width === 0) return [];

		const root = hierarchy<TreeDatum>({ children: slices }).sum(datum => datum.value ?? 0);
		const laidOut = treemap<TreeDatum>().tile(treemapSquarify).size([size.width, size.height]).paddingInner(3).round(true)(root);

		return laidOut.leaves().map(leaf => ({
			slice: leaf.data as TreemapSlice,
			x: leaf.x0,
			y: leaf.y0,
			width: leaf.x1 - leaf.x0,
			height: leaf.y1 - leaf.y0
		}));
	}, [slices, size]);

	const tip = pointed ? slices.find(slice => slice.key === pointed.key) : undefined;
	const menuSlice = menuKey ? slices.find(slice => slice.key === menuKey) : undefined;

	const blocks = (
		<div ref={ref} role="group" aria-label={label} className="relative w-full" style={{ height }} onMouseLeave={() => setPointed(null)}>
			{cells.map(({ slice, x, y, width, height: cellHeight }) => {
				const other = slice.key === OTHER_KEY;
				const dimmed = pointed && pointed.key !== slice.key;
				const roomy = width >= 76 && cellHeight >= 48;
				// A block can't be narrower than its own padding, so a tiny one with padding would spill out of its rectangle
				// (and out of the whole treemap): only blocks with room get any.
				const padded = width >= 40 && cellHeight >= 28;

				return (
					<div
						key={slice.key}
						tabIndex={0}
						role="img"
						aria-label={`${slice.label}${slice.hint ? `, ${slice.hint}` : ""}: ${percent(slice.value / Math.max(1, total))}`}
						onMouseMove={event => setPointed({ key: slice.key, x: event.clientX, y: event.clientY })}
						onFocus={event => setPointed({ key: slice.key, ...centerOf(event.currentTarget) })}
						onBlur={() => setPointed(null)}
						onContextMenu={() => { setMenuKey(slice.key); setPointed(null); }}
						className={cn(
							"absolute overflow-hidden rounded-[3px] outline-none transition-opacity duration-150 focus-visible:ring-2 focus-visible:ring-ring",
							padded && "p-1.5",
							other ? "text-foreground" : "text-zinc-900",
							dimmed && "opacity-30",
							slice.outlined && "ring-2 ring-inset ring-foreground/80",
							menu && "cursor-context-menu"
						)}
						style={{ left: x, top: y, width, height: cellHeight, background: other ? STRIPES : slice.color }}
					>
						{width >= 28 && cellHeight >= 24 && (
							<>
								<div className={cn("flex items-center gap-1 truncate font-mono leading-tight font-bold", roomy ? "text-sm" : "text-xs")}>
									{slice.mark}
									<span className="truncate">{other ? "Others" : slice.label}</span>
								</div>
								{roomy && <div className="font-mono text-xs leading-tight opacity-75 tabular-nums">{percent(slice.value / Math.max(1, total))}</div>}
								{/* the big ones have room to say who they are */}
								{width >= 110 && cellHeight >= 76 && slice.hint && <div className="mt-0.5 truncate text-xs leading-tight opacity-75">{slice.hint}</div>}
							</>
						)}
					</div>
				);
			})}
		</div>
	);

	return (
		<div className={className}>
			{menu ? (
				<ContextMenu onOpenChange={open => { if (!open) setMenuKey(null); }}>
					<ContextMenuTrigger asChild>{blocks}</ContextMenuTrigger>
					<ContextMenuContent>{menuSlice && menu(menuSlice)}</ContextMenuContent>
				</ContextMenu>
			) : blocks}

			{/* not while a menu is open: it would sit on top of it */}
			{pointed && tip && !menuKey && (
				<CursorTip at={pointed} stripe={tip.key === OTHER_KEY ? OTHERS : tip.color}>
					<TipHeading code={tip.key === OTHER_KEY ? "Others" : tip.label} name={tip.hint} />
					<TipText>{percent(tip.value / Math.max(1, total))} {shareOf}</TipText>
					{tip.tip}
					{menu && <TipText>Right click for actions</TipText>}
				</CursorTip>
			)}
		</div>
	);
};
