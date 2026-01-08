import { cn } from "~/lib/utils";
import { Button } from "./button";
import { Separator } from "./separator";
import { ButtonGroup } from "./button-group";
import { useMobile } from "../mobile-provider";
import { MapLayerSelector } from "./map-layer-select";
import { useMap, ViewState } from "react-map-gl/mapbox";
import { TooltipContentProps } from "@radix-ui/react-tooltip";
import { PropsWithChildren, ReactNode, RefObject } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

import {
	ArrowUpRight,
	Info,
	Layers2,
	Maximize,
	MinusIcon,
	PlusIcon,
	Undo
} from "lucide-react";

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from "./dialog";

const positioning = {
	"top-left": "top-2 left-2",
	"top-right": "top-2 right-2",
	"bottom-left": "bottom-2 left-2",
	"bottom-right": "bottom-2 right-2",
};

export type Side = "top" | "bottom" | "left" | "right";

const tooltipDropdownPosition: Record<keyof typeof positioning, Side> = {
	"bottom-left": "top",
	"bottom-right": "top",
	"top-left": "right",
	"top-right": "left"
}

export type MapLayers = Array<{
	key: string;
	name: string;
	color: string;
	count: number;
	defaultState?: boolean;
}>;

const TooltipWrapper: React.FC<PropsWithChildren<{ content: ReactNode, opts?: TooltipContentProps }>> = ({ children, content, opts }) => (
	<Tooltip>
		<TooltipTrigger asChild>
			{children}
		</TooltipTrigger>
		<TooltipContent {...opts}>
			{content}
		</TooltipContent>
	</Tooltip>
)

const MapAttributions: React.FC = () => (
	<Dialog>
		<Tooltip>
			<TooltipTrigger asChild>
				<DialogTrigger asChild>
					<Button variant="outline" size="icon">
						<Info />
					</Button>
				</DialogTrigger>
			</TooltipTrigger>
			<TooltipContent side="left">
				Map attributions
			</TooltipContent>
		</Tooltip>
		<DialogContent>
			<DialogHeader>
				<DialogTitle>
					Map Attributions
				</DialogTitle>
				<DialogDescription>
					All copyrights are retained by their original owners. Map data and tiles are provided by the below copyright owners. 
				</DialogDescription>
			</DialogHeader>
			
			<Separator />
			
			<div className="flex flex-col space-y-4">
				<div className="flex flex-col">
					<div>Mapbox</div>
					<div className="font-mono tracking-tighter text-muted-foreground text-xs">
						<a href="https://www.mapbox.com/about/maps">https://www.mapbox.com/about/maps</a>
					</div>
				</div>
				<div className="flex flex-col">
					<div>OpenStreetMap</div>
					<div className="font-mono tracking-tighter text-muted-foreground text-xs">
						<a href="https://www.openstreetmap.org/copyright/">https://www.openstreetmap.org/copyright/</a>
					</div>
				</div>
			</div>
			
			<Separator />
			
			<div className="flex flex-col space-y-1">
				<div>Aviation Data</div>
				<div className="font-mono tracking-tighter text-muted-foreground text-xs">
					Aviation overlays throughout the website have been developed independently and use FAA data sourced from ArcGIS, which is shared under the public domain.
				</div>
				<div className="flex flex-row space-x-2 mt-2">
					<div>
						<a
							className="font-mono tracking-tighter text-blue-300 text-sm flex flex-row gap-1 items-center"
							href="https://adds-faa.opendata.arcgis.com/"
						>
							FAA ArcGIS Homepage
							<ArrowUpRight className="size-4" />
						</a>
					</div>
				</div>
			</div>
			
			<Separator />
			
			<div className="flex flex-col space-y-1">
				<div>Map Improvements</div>
				<div className="font-mono tracking-tighter text-muted-foreground text-xs">
					Consider improving maps across the internet by submitting feedback or corrections to Mapbox if you notice something wrong with the map content or the map itself.
				</div>
				<div className="mt-2">
					<a
						className="font-mono tracking-tighter text-blue-300 text-sm flex flex-row gap-1 items-center"
						href="https://apps.mapbox.com/feedback/?owner=mapbox&id=dark-v11&access_token=pk.eyJ1Ijoibm90bTFrZSIsImEiOiJjbWoyNm55ZGwwc2J6M2ZxMDcyOGM5eXFzIn0.x3JMQ0M-BJaeLwEEpjYqVQ#/-97.5/37/3.25"
					>
						Feedback
						<ArrowUpRight className="size-4" />
					</a>
				</div>
			</div>
		</DialogContent>
	</Dialog>
);

type SectionType = "zoom-controls" | "map-controls" | "informational";

type CustomMapControl = {
	section: SectionType;
	node: (side: Side) => ReactNode;
}

type MapControlsProps = {
	ref: RefObject<HTMLDivElement | null>;
	position: keyof typeof positioning;
	orientation?: "vertical" | "horizontal";
	initialView: Partial<ViewState>;
	showReset?: boolean;
	showFullscreen?: boolean;
	layers?: MapLayers;
	layerState?: Set<string>;
	syncLayers?: (enabled: Set<string>) => void;
	customControls?: Array<CustomMapControl>;
}

export const MapControls: React.FC<MapControlsProps> = ({
	ref,
	position = "top-left",
	orientation = "vertical",
	initialView,
	showFullscreen,
	showReset = false,
	layers = [],
	layerState = new Set<string>(),
	syncLayers: toggleLayer = _ => { },
	customControls
}) => {
	const mapRef = useMap();
	const { mobile, pending } = useMobile();
	
	const zoomIn = () => mapRef.current?.zoomIn();
	const zoomOut = () => mapRef.current?.zoomOut();
	const fullscreen = () => {
		if (!ref.current) return;
		const container = ref.current;
		
		if (document.fullscreenElement === container) {
			container.setAttribute("data-fullscreen", "false");
			return document.exitFullscreen();
		}
		
		container
			.requestFullscreen()
			.then(() => {
				container.setAttribute("data-fullscreen", "true");
				document.addEventListener("fullscreenchange", () => {
					if (!document.fullscreenElement) {
						container.setAttribute("data-fullscreen", "false");
					}
				});
			})
			.catch(() => {
				console.warn("Error obtaining fullscreen for container")
			});
	}
	
	const reset = () => mapRef.current?.flyTo({
		zoom: initialView.zoom,
		center: {
			lat: initialView.latitude!,
			lng: initialView.longitude!,
		}
	});
	
	const hasCustomControls = (section: SectionType) => customControls
		?.some(control => control.section === section);
	
	const renderCustomControl = (control: CustomMapControl) => control.node(side);
	
	const getCustomControlsForSection = (section: SectionType) => customControls
		?.filter(control => control.section === section)
		?.map(renderCustomControl);
	
	const side = orientation === "vertical"
		? tooltipDropdownPosition[position]
		: position.includes("top")
			? "bottom"
			: "top";

	return (
		<div className={cn(
			"flex gap-1.5 absolute",
			orientation === "vertical"
				? "flex-col"
				: "flex-row",
			positioning[position]
		)}>
			<ButtonGroup
				orientation={orientation}
				aria-label="Zoom controls"
				className="h-fit bg-background rounded-lg"
			>
				<TooltipWrapper content="Zoom in" opts={{ side }}>
					<Button variant="outline" size="icon" onClick={zoomIn}>
						<PlusIcon />
					</Button>
				</TooltipWrapper>
				<TooltipWrapper content="Zoom out" opts={{ side }}>
					<Button variant="outline" size="icon" onClick={zoomOut}>
						<MinusIcon />
					</Button>
				</TooltipWrapper>
				
				{getCustomControlsForSection("zoom-controls")}
			</ButtonGroup>
			
			{(showFullscreen || showReset || layers || hasCustomControls("map-controls")) && (
				<ButtonGroup
					orientation={orientation}
					aria-label="Reset map controls"
					className="h-fit bg-background rounded-lg"
				>
					{getCustomControlsForSection("map-controls")}
					
					{layers.length > 0 && (
						<MapLayerSelector
							items={layers}
							selectedKeys={layerState}
							onSelectionChange={toggleLayer}
							side={side}
						>
							<Button variant="outline" size="icon">
								<Layers2 />
							</Button>
						</MapLayerSelector>
					)}
					
					{(!mobile || pending) && showFullscreen && (
						<TooltipWrapper content="Toggle fullscreen" opts={{ side }}>
							<Button variant="outline" size="icon" onClick={fullscreen}>
								<Maximize />
							</Button>
						</TooltipWrapper>
					)}
					
					{showReset && initialView && (
						<TooltipWrapper content="Reset map" opts={{ side }}>
							<Button variant="outline" size="icon" onClick={reset}>
								<Undo />
							</Button>
						</TooltipWrapper>
					)}
				</ButtonGroup>
			)}
			
			<ButtonGroup
				orientation={orientation}
				aria-label="Map attributions"
				className="h-fit bg-background rounded-lg"
			>
				{getCustomControlsForSection("informational")}
				<MapAttributions />
			</ButtonGroup>
		</div>
	);
};