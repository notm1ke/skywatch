import { cn } from "~/lib/utils";
import { Fragment } from "react";
import { useWaypointControls } from "./store";
import { DropdownMenuItem, DropdownMenuSeparator } from "../ui/dropdown-menu";

type MapStylePreview = 
	| string
	| { light: string, dark: string }

type MapStyle = {
	key: WaypointMapStyleType;
	name: string;
	description: string;
	preview: MapStylePreview;
}

const assetCdn = process.env.NEXT_PUBLIC_ASSETS_CDN_BASE!;
const fromCdn = (path: string) => assetCdn + path;

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
		preview: {
			light: fromCdn("/map-preview-default-light.png"),
			dark: fromCdn("/map-preview-default-dark.png"),
		}
	},
	{
		key: "ifr",
		name: "IFR Charts",
		description: "IFR Enroute Low Altitude",
		preview: fromCdn("/map-preview-ifr.png")
	},
	{
		key: "vfr",
		name: "VFR Charts",
		description: "VFR Enroute Low Altitude",
		preview: fromCdn("/map-preview-vfr.png")
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