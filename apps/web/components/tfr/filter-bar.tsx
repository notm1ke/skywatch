"use client";

import { cn } from "cnfast";
import { Scan, Tag } from "lucide-react";
import { Hint } from "~/components/ui/hint";
import { BarToggle } from "~/components/ui/bar-toggle";
import { useTfrControls } from "./store";
import { typeInfo } from "./types";

type Props = {
	/** TFRs per type, most first: from the whole list, so the counts stay put when a type is switched off */
	counts: Array<[string, number]>;
	/** TFRs in the table after the filters / all of them */
	shown: number;
	total: number;
	loading: boolean;
};

export const FilterBar: React.FC<Props> = ({ counts, shown, total, loading }) => {
	const hiddenTypes = useTfrControls(state => state.hiddenTypes);
	const labels = useTfrControls(state => state.labels);
	const inView = useTfrControls(state => state.inView);
	const selectedId = useTfrControls(state => state.selectedId);
	const { toggleType, setLabels, setInView, reset } = useTfrControls.getState();

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
								{info.label}
							</>
						}
						body={info.description}
						note={`${count} in the list, current or upcoming. Click to ${hidden ? "show" : "hide"} them, on the map and in the table.`}
					>
						<BarToggle pressed={!hidden} onClick={() => toggleType(type)} className={cn(hidden && "opacity-50")}>
							<span className="size-2 rounded-full" style={{ backgroundColor: info.color }} />
							<span className="font-mono">{info.label}</span>
							<span className="font-mono text-xs tabular-nums text-muted-foreground">{count}</span>
						</BarToggle>
					</Hint>
				);
			})}

			<Hint
				title="In view"
				body="Only list the TFRs inside the part of the map you're looking at. Move or zoom the map and the table follows."
				note={inView
					? "On: the table follows the map. TFRs the FAA hasn't drawn an outline for aren't on the map, so they're left out."
					: "Off: the table lists every TFR."}
			>
				<BarToggle pressed={inView} onClick={() => setInView(!inView)}>
					<Scan className="size-3.5" />
					In view
				</BarToggle>
			</Hint>

			<Hint
				title="Labels"
				body="Write each TFR's place beside it once you're zoomed in far enough to read them, about the size of a few states."
				note={labels ? "On." : "Off: just the shapes."}
			>
				<BarToggle pressed={labels} onClick={() => setLabels(!labels)}>
					<Tag className="size-3.5" />
					Labels
				</BarToggle>
			</Hint>

			<div className="ml-auto flex h-full shrink-0 items-center gap-3 border-l-0 px-3 text-xs text-muted-foreground">
				{loading
					? <span>Loading TFRs…</span>
					: (
						<span className="font-mono tabular-nums">
							{shown.toLocaleString()}{shown !== total && <> of {total.toLocaleString()}</>} TFRs
						</span>
					)}
				<button
					type="button"
					onClick={() => reset()}
					disabled={!selectedId && hiddenTypes.length === 0 && !inView}
					className="cursor-pointer underline-offset-4 enabled:hover:text-foreground enabled:hover:underline disabled:cursor-default disabled:opacity-30"
				>
					Clear
				</button>
			</div>
		</div>
	);
};
