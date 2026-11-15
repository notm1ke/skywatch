"use client";

import { Badge } from "../ui/badge";
import { orpc } from "~/lib/gateway";
import { Button } from "../ui/button";
import { motion } from "motion/react";
import { useMemo } from "react";
import { FilterBar } from "./filter-bar";
import { HoverHint } from "./hover-hint";
import { WaypointPanel } from "./search";
import { useWaypointControls } from "./store";
import { WaypointMap } from "./waypoint-map";
import { useWaypointUrlSync } from "./url-sync";
import { useQuery } from "@tanstack/react-query";
import { buildIndex, type MapPoint } from "./geo";
import { Loader, RefreshCcw, WaypointsIcon } from "lucide-react";

import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle
} from "../ui/empty";

const NO_POINTS: MapPoint[] = [];

/**
 * Every waypoint on a map. Hover a dot to see what it is, click it (or search) to open it: its airways are drawn on
 * the map, and the panel lists them along with the preferred routes that use it.
 */
export const WaypointsTab = () => {
	useWaypointUrlSync();

	const hiddenTypes = useWaypointControls(state => state.hiddenTypes);

	const { data, isLoading, error, refetch } = useQuery({
		...orpc.airspace.waypoints.points.queryOptions(),
		// the waypoints only change with a new FAA cycle: no reason to ask again while the tab is open
		staleTime: Infinity
	});

	const index = useMemo(() => buildIndex(data ?? NO_POINTS), [data]);
	const total = data?.length ?? 0;
	const visible = useMemo(
		() => index.counts.reduce((sum, [type, count]) => hiddenTypes.includes(type) ? sum : sum + count, 0),
		[index, hiddenTypes]
	);

	if (error || (!isLoading && !data)) return (
		<div className="h-(--page-height) flex flex-col items-center justify-center bg-muted/5">
			<Empty>
				<EmptyHeader>
					<EmptyMedia>
						<div className="relative bg-red-200 dark:bg-red-700 px-2 py-2 rounded-lg">
							<WaypointsIcon className="size-6 text-red-600 dark:text-red-300" />
						</div>
					</EmptyMedia>
					<EmptyTitle>Something went wrong</EmptyTitle>
					<EmptyDescription>
						We ran into an issue while retrieving waypoint data, please try again.
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
		<div className="flex h-(--page-height) flex-col">
			<div className="relative min-h-0 flex-1">
				<WaypointMap index={index} ready={Boolean(data)} />

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
				<WaypointPanel index={index} />
			</div>

			<FilterBar counts={index.counts} visible={visible} total={total} loading={isLoading} />
		</div>
	);
};
