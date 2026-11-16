"use client";

import { cn } from "cnfast";
import { useTfrControls } from "./store";
import { placeOf, typeInfo } from "./types";
import type { TfrIndex } from "./geo";

/** What a click would open. Sits over the top of the map and never takes the pointer. */
export const HoverHint: React.FC<{ index: TfrIndex }> = ({ index }) => {
	const hoverId = useTfrControls(state => state.hoverId);
	const selectedId = useTfrControls(state => state.selectedId);

	if (!hoverId || hoverId === selectedId) return null;

	const tfr = index.records.get(hoverId);
	if (!tfr) return null;

	const info = typeInfo(tfr.type);

	return (
		// centered on the map; with the panel open over its left side (24rem wide) it's centered on what's left
		<div className={cn(
			"pointer-events-none absolute top-2 left-1/2 z-10 hidden -translate-x-1/2 items-center gap-2 rounded-lg border bg-background/90 px-3 py-1.5 text-sm shadow-lg backdrop-blur lg:flex",
			selectedId && "lg:left-[calc(50%+12rem)]"
		)}>
			<span className="size-2 rounded-full" style={{ backgroundColor: info.color }} />
			<span className="font-mono font-semibold">{tfr.notam_id}</span>
			<span className="text-xs text-muted-foreground">{info.label} · {placeOf(tfr.description)} · click to open</span>
		</div>
	);
};
