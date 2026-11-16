"use client";

import { Badge } from "../ui/badge";
import { orpc } from "~/lib/gateway";
import { Button } from "../ui/button";
import { motion } from "motion/react";
import { TfrMap } from "./tfr-map";
import { FilterBar } from "./filter-bar";
import { HoverHint } from "./hover-hint";
import { TfrPanel } from "./details";
import { useTfrControls } from "./store";
import { useTfrUrlSync } from "./url-sync";
import { useQuery } from "@tanstack/react-query";
import { buildIndex, intersects } from "./geo";
import { TfrTable, TfrTableSkeletonLoader } from "./tfr-table";
import { Loader, MegaphoneOff, RefreshCcw } from "lucide-react";
import { useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";

import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle
} from "../ui/empty";

/** how much of the page the map gets until it's dragged, and the most and least it can have */
const DEFAULT_SPLIT = 0.58;
const MIN_SPLIT = 0.22;
const MAX_SPLIT = 0.8;

const clampSplit = (split: number) => Math.min(MAX_SPLIT, Math.max(MIN_SPLIT, split));

/**
 * Every active TFR, on a map and in a table that follow each other. Hover or click a shape, or a row, and the other one
 * answers; the panel over the map says what the TFR is.
 */
export const TfrsTab = () => {
	useTfrUrlSync();

	const hiddenTypes = useTfrControls(state => state.hiddenTypes);
	// what the map is showing, but only while the table is following it
	const view = useTfrControls(state => state.inView ? state.view : null);

	const { data, isLoading, error, refetch } = useQuery(orpc.airspace.tfrs.overview.queryOptions());

	const index = useMemo(() => buildIndex(data), [data]);

	const tfrs = useMemo(() => (data?.tfrs ?? []).filter(tfr => {
		if (hiddenTypes.includes(tfr.type)) return false;

		// one with no outline isn't on the map, so it isn't in view of it
		if (view) {
			const item = index.items.get(tfr.notam_id);
			return Boolean(item && intersects(item.bounds, view));
		}

		return true;
	}), [data, index, hiddenTypes, view]);

	// --- the divider between the map and the table --------------------------------------------------------------
	const [split, setSplit] = useState(DEFAULT_SPLIT);
	const shellRef = useRef<HTMLDivElement>(null);

	const drag = (event: PointerEvent<HTMLDivElement>) => {
		const shell = shellRef.current;
		if (!shell || !event.currentTarget.hasPointerCapture(event.pointerId)) return;

		const box = shell.getBoundingClientRect();
		setSplit(clampSplit((event.clientY - box.top) / box.height));
	};

	const nudge = (event: KeyboardEvent<HTMLDivElement>) => {
		if (event.key === "ArrowUp") setSplit(current => clampSplit(current - 0.03));
		else if (event.key === "ArrowDown") setSplit(current => clampSplit(current + 0.03));
		else return;

		event.preventDefault();
	};

	if (error || (!isLoading && !data)) return (
		<div className="h-(--page-height) flex flex-col items-center justify-center bg-muted/5">
			<Empty>
				<EmptyHeader>
					<EmptyMedia>
						<div className="relative bg-red-200 dark:bg-red-700 px-2 py-2 rounded-lg">
							<MegaphoneOff className="size-6 text-red-600 dark:text-red-300 -ml-0.5" />
						</div>
					</EmptyMedia>
					<EmptyTitle>Something went wrong</EmptyTitle>
					<EmptyDescription>
						We ran into an issue while retrieving TFR data, please try again.
					</EmptyDescription>

					<EmptyContent className="mt-2">
						<Button
							size="sm"
							variant="outline"
							className="text-muted-foreground"
							onClick={() => refetch()}
						>
							<RefreshCcw />
							<span>Retry</span>
						</Button>
					</EmptyContent>
				</EmptyHeader>
			</Empty>
		</div>
	);

	return (
		<div
			ref={shellRef}
			className="flex h-(--page-height) flex-col"
			style={{ "--tfr-split": split } as CSSProperties}
		>
			<div className="relative min-h-0 shrink-0" style={{ height: `${split * 100}%` }}>
				<TfrMap index={index} ready={Boolean(data)} />

				{isLoading && (
					<motion.div
						className="absolute bottom-2 left-2 z-10"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.3 }}
					>
						<Badge variant="purple" className="rounded-sm py-2 px-2">
							<Loader className="animate-spin duration-200" />
						</Badge>
					</motion.div>
				)}

				<HoverHint index={index} />
				<TfrPanel index={index} ready={Boolean(data)} />
			</div>

			<div className="relative min-h-0 flex-1 border-t">
				{/* drag to give the map or the table more room; arrow keys too, double click puts it back */}
				<div
					role="separator"
					aria-orientation="horizontal"
					aria-label="Resize the map and the table"
					aria-valuemin={MIN_SPLIT * 100}
					aria-valuemax={MAX_SPLIT * 100}
					aria-valuenow={Math.round(split * 100)}
					tabIndex={0}
					onPointerDown={event => event.currentTarget.setPointerCapture(event.pointerId)}
					onPointerMove={drag}
					onKeyDown={nudge}
					onDoubleClick={() => setSplit(DEFAULT_SPLIT)}
					className="group absolute inset-x-0 -top-1.5 z-20 flex h-3 cursor-row-resize touch-none items-center justify-center outline-none"
				>
					<span className="h-1 w-10 rounded-full bg-foreground/0 transition-colors group-hover:bg-foreground/25 group-focus-visible:bg-foreground/25 group-active:bg-foreground/40" />
				</div>

				{isLoading ? <TfrTableSkeletonLoader /> : <TfrTable tfrs={tfrs} />}
			</div>

			<FilterBar counts={index.counts} shown={tfrs.length} total={data?.tfrs.length ?? 0} loading={isLoading} />
		</div>
	);
};
