"use client";

import { WaypointUseLocalizations } from "@skywatch/gateway/schemas";
import { useWaypointControls } from "./store";
import { typeInfo } from "./types";
import type { WaypointIndex } from "./geo";

/** What a click would open. Sits over the top of the map and never takes the pointer. */
export const HoverHint: React.FC<{ index: WaypointIndex }> = ({ index }) => {
	const hoverId = useWaypointControls(state => state.hoverId);
	const selectedId = useWaypointControls(state => state.selectedId);

	if (!hoverId || hoverId === selectedId) return null;

	const type = index.types.get(hoverId) ?? "";

	return (
		<div className="pointer-events-none absolute top-2 left-1/2 z-10 hidden -translate-x-1/2 items-center gap-2 rounded-lg border bg-background/90 px-3 py-1.5 text-sm shadow-lg backdrop-blur lg:left-[calc(50%+12rem)] lg:flex">
			<span className="size-2 rounded-full" style={{ backgroundColor: typeInfo(type).color }} />
			<span className="font-mono font-semibold">{hoverId}</span>
			<span className="text-xs text-muted-foreground">{WaypointUseLocalizations[type] ?? type} · click to open</span>
		</div>
	);
};
