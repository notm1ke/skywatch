import { cn } from "~/lib/utils";
import { RefObject } from "react";
import { orpc } from "~/lib/gateway";
import { useQuery } from "@tanstack/react-query";
import { useWaypointPageControls } from "./store";
import { SkeletonWithDelay } from "../ui/skeleton";
import { CircleX, FileQuestion } from "lucide-react";
import { renderWaypointLocation, WaypointTypeIcon } from "./search";
import { WaypointUseLocalizations } from "@skywatch/gateway/schemas";

type WaypointDetailsProps = {
	inputRef: RefObject<HTMLInputElement | null>;
};

export const WaypointDetailsPane = ({ inputRef }: WaypointDetailsProps) => {
	const { active, deactivate } = useWaypointPageControls();
	const { data: waypoint, isLoading, error } = useQuery(orpc.airspace.waypoints.findById.queryOptions({
		input: { waypoint_id: active?.waypoint_id ?? "<noop>" },
		enabled: !!active
	}));
	
	if (!active) return null;
	 
	// todo
	if (isLoading) return (
		<div className="bg-background/80 h-[calc(79svh)] rounded-sm px-4 py-2 flex flex-col space-y-2">
			{Array.from({ length: 15 }).map((_, i) => (
				<SkeletonWithDelay
					key={`waypoint-details-skeleton-${i}`}
					className="h-8 w-full"
					delay={i * 75}
				/>
			))}
		</div>
	);
	
	if (error || !waypoint) return (
		<>not found</>
	);
	
	const indicator = WaypointTypeIcon[waypoint.waypoint_use_code] ?? {
		icon: FileQuestion,
		color: "text-muted-foreground"
	};
	
	return (
		<div className="bg-background h-[calc(79svh)] rounded-sm divide-y dark:divide-zinc-700/80 border border-border dark:border-zinc-700/80">
			<div className="flex flex-row justify-between items-center px-4 py-4">
				<div className="flex flex-row space-x-4">
					<div>
						<indicator.icon className={cn("size-8", indicator.color)} />
					</div>
					<div className="flex flex-col space-y-0.5">
						<div className="font-medium">{waypoint.waypoint_id}</div>
						<div className="flex flex-row space-x-1.5 text-xs font-mono tracking-tighter text-muted-foreground">
							<span>{WaypointUseLocalizations[waypoint.waypoint_use_code]}</span>
							<span>•</span>
							<span>{renderWaypointLocation(waypoint)}</span>
						</div>
					</div>
				</div>
				<div>
					{/* todo */}
				</div>
			</div>
			<pre className="text-muted-foreground">{JSON.stringify(waypoint, null, 3)}</pre>
		</div>
	)
}