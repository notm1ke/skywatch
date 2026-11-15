"use client";

import { cn } from "cnfast";
import { Tag } from "lucide-react";
import { Hint } from "~/components/ui/hint";
import { BarToggle } from "~/components/ui/bar-toggle";
import { WaypointUseLocalizations } from "@skywatch/gateway/schemas";
import { useWaypointControls } from "./store";
import { typeInfo } from "./types";

type Props = {
	/** waypoints per type, most first: from the whole data set, so the counts stay put when a type is switched off */
	counts: Array<[string, number]>;
	/** waypoints showing after the type filters / all of them */
	visible: number;
	total: number;
	loading: boolean;
};

export const FilterBar: React.FC<Props> = ({ counts, visible, total, loading }) => {
	const hiddenTypes = useWaypointControls(state => state.hiddenTypes);
	const labels = useWaypointControls(state => state.labels);
	const selectedId = useWaypointControls(state => state.selectedId);
	const { toggleType, setLabels, clear } = useWaypointControls.getState();

	return (
		<div className="flex h-10 shrink-0 divide-x overflow-x-auto border-t bg-background text-sm">
			{counts.map(([type, count]) => {
				const info = typeInfo(type);
				const hidden = hiddenTypes.includes(type);

				return (
					<Hint
						key={type}
						title={
							<>
								<span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: info.color }} />
								{WaypointUseLocalizations[type] ?? type}
								<span className="font-mono text-xs font-normal text-background/60">{type}</span>
							</>
						}
						body={info.description}
						note={`${count.toLocaleString()} waypoints. Click to ${hidden ? "show" : "hide"} them.${info.appearsAt > 4 ? " They show up once you zoom in." : ""}`}
					>
						<BarToggle pressed={!hidden} onClick={() => toggleType(type)} className={cn(hidden && "opacity-50")}>
							<span className="size-2 rounded-full" style={{ backgroundColor: info.color }} />
							<span className="font-mono">{type}</span>
							<span className="font-mono text-xs tabular-nums text-muted-foreground">{count.toLocaleString()}</span>
						</BarToggle>
					</Hint>
				);
			})}

			<Hint
				title="Labels"
				body="Write each waypoint's name beside it once you're zoomed in close enough to read them, about the size of a state."
				note={labels ? "On." : "Off: just the dots."}
			>
				<BarToggle pressed={labels} onClick={() => setLabels(!labels)}>
					<Tag className="size-3.5" />
					Labels
				</BarToggle>
			</Hint>

			<div className="ml-auto flex h-full shrink-0 items-center gap-3 border-l-0 px-3 text-xs text-muted-foreground">
				{loading
					? <span>Loading waypoints…</span>
					: (
						<span className="font-mono tabular-nums">
							{visible.toLocaleString()}{visible !== total && <> of {total.toLocaleString()}</>} waypoints
						</span>
					)}
				<button
					type="button"
					onClick={() => clear()}
					disabled={!selectedId}
					className="cursor-pointer underline-offset-4 enabled:hover:text-foreground enabled:hover:underline disabled:cursor-default disabled:opacity-30"
				>
					Clear
				</button>
			</div>
		</div>
	);
};
