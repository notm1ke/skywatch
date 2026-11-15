import { cn } from "cnfast";
import { Fragment } from "react";
import { useWaypointControls } from "./store";
import { DropdownMenuItem, DropdownMenuSeparator } from "../ui/dropdown-menu";

// What sits under the waypoints. The chart styles are raster layers from the FAA's tile servers
// (see style-layer.tsx); "default" is the plain map.

type MapStylePreview =
	| string
	| { light: string, dark: string }

type MapStyle = {
	key: WaypointMapStyleType;
	name: string;
	description: string;
	preview: MapStylePreview;
}

const WaypointMapStyleTypes = [
	"default",
	"ifr",
	"vfr"
] as const;

export type WaypointMapStyleType = typeof WaypointMapStyleTypes[number];

export const WaypointMapStyles: MapStyle[] = [
	{
		key: "default",
		name: "Default",
		description: "Default map style",
		// the thumbnails live in public/map-previews: a crop of the map around New York, and of each chart there
		preview: {
			light: "/map-previews/default-light.jpg",
			dark: "/map-previews/default-dark.jpg",
		}
	},
	{
		key: "ifr",
		name: "IFR Charts",
		description: "IFR Enroute Low Altitude",
		preview: "/map-previews/ifr.jpg"
	},
	{
		key: "vfr",
		name: "VFR Charts",
		description: "VFR Enroute Low Altitude",
		preview: "/map-previews/vfr.jpg"
	},
];

export const MapStyleSelector = () => {
	const { style: active, updateStyle } = useWaypointControls();
	return WaypointMapStyles.map((style, i, arr) => (
		<Fragment key={style.key}>
			{(i !== 0 && i <= arr.length - 1) && <DropdownMenuSeparator />}

			<DropdownMenuItem
				className={cn(
					"flex flex-row py-2 space-x-2",
					active === style.key ? "bg-primary/10" : ""
				)}
				onClick={() => {
					if (active === style.key) return;
					updateStyle(style.key);
				}}
			>
				<div className="w-14 h-11 [&>img]:rounded-md shrink-0">
					{typeof style.preview === "string" && (
						<img
							src={style.preview}
							alt={`${style.name} preview`}
							className="w-full h-full object-cover"
						/>
					)}

					{typeof style.preview === "object" && (
						<>
							<img
								src={style.preview.light}
								alt={`${style.name} preview`}
								className="dark:hidden w-full h-full object-cover"
							/>

							<img
								src={style.preview.dark}
								alt={`${style.name} preview`}
								className="hidden dark:inline w-full h-full object-cover"
							/>
						</>
					)}
				</div>

				<div className="flex-1 min-w-0">
					<div className="font-medium text-sm leading-none mb-1">{style.name}</div>
					<div className="text-xs text-muted-foreground leading-relaxed">{style.description}</div>
				</div>
			</DropdownMenuItem>
		</Fragment>
	))
}
