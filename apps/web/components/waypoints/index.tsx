"use client";

import { Badge } from "../ui/badge";
import { orpc } from "~/lib/gateway";
import { motion } from "motion/react";
import { Button } from "../ui/button";
import { useTheme } from "next-themes";
import { useRef, useState } from "react";
import { WaypointSearchbar } from "./search";
import { useWaypointControls } from "./store";
import { useQuery } from "@tanstack/react-query";
import { MapStyleSelector } from "./style-selector";
import { Layer, Map, Source } from "react-map-gl/mapbox";
import { MapControls, MapLayers } from "../ui/map-controls";
import { Loader, MapIcon, RefreshCcw, WaypointsIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "../ui/dropdown-menu";

import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle
} from "../ui/empty";
import { WaypointMapStyleLayer } from "./style-layer";

export const WaypointsTab = () => {
	const { resolvedTheme: theme } = useTheme();
	const { active } = useWaypointControls();
	const { data, isLoading, error, refetch } = useQuery(orpc.airspace.waypoints.geojson.queryOptions());
	
	const mapContainerRef = useRef<HTMLDivElement>(null);
	const layers: MapLayers = [
		{
			key: "waypoint",
			name: "Waypoint",
			color: "var(--color-purple-400)",
			count: data?.features.length || NaN
		},
		{
			key: "label",
			name: "Label",
			color: "var(--color-zinc-400)",
			count: data?.features.length || NaN
		}
	];
	
	const [enabledLayers, setEnabledLayers] = useState<Set<string>>(
		() => new Set<string>(
			layers
				.filter(layer => layer.defaultState === undefined || layer.defaultState === true)
				.map(layer => layer.key)
		)
	);
	
	if (error || (!isLoading && !data)) return (
		<div className="h-[calc(100vh-8rem)] flex flex-col items-center justify-center bg-muted/5">
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
	)
	
	return (
		<div
			ref={mapContainerRef}
			className="relative w-full data-[fullscreen='true']:h-screen data-[fullscreen='false']:h-[calc(85svh)]"
			data-fullscreen={false}
		>
			<Map
				mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
				initialViewState={{
					latitude: 37.833333,
					longitude: -97.583333,
					zoom: 4.15
				}}
				projection="mercator"
				attributionControl={false}
				interactiveLayerIds={['airspace']}
				style={{ width: "100%" }}
				mapStyle={
					theme === "dark"
						? "mapbox://styles/mapbox/dark-v11"
						: "mapbox://styles/mapbox/light-v11"
				}
			>
				<WaypointSearchbar />
				
				<MapControls
					ref={mapContainerRef}
					position="top-right"
					initialView={{
						latitude: 37.833333,
						longitude: -97.583333,
						zoom: 4.15
					}}
					showFullscreen
					showReset
					layers={layers}
					layerState={enabledLayers}
					syncLayers={setEnabledLayers}
					customControls={[
						{
							section: "map-controls",
							node: side => (
								<DropdownMenu key="waypoint-map-style-control">
									<Tooltip>
										<DropdownMenuTrigger asChild>
											<TooltipTrigger asChild>
												<Button variant="outline" size="icon">
													<MapIcon />
												</Button>
											</TooltipTrigger>
										</DropdownMenuTrigger>
										<DropdownMenuContent side={side} align="start">
											<MapStyleSelector />
										</DropdownMenuContent>
										<TooltipContent side={side}>
											Map styles
										</TooltipContent>
									</Tooltip>
								</DropdownMenu>
							)
						}
					]}
				/>
				
				{isLoading && (
					<motion.div
						className="absolute bottom-2 right-2"
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
				
				{!isLoading && (
					<>
						<WaypointMapStyleLayer />
						
						{enabledLayers.has("waypoint") && (
							<Source id="markers" type="geojson" data={data}>
								<Layer
									id="points"
									type="circle"
									minzoom={3.5}
									paint={{
										'circle-radius': 4,
										'circle-color': theme === "dark" ? "#6E11B0" : "#C27AFF",
										"circle-opacity": 0.85
									}}
								 />
							</Source>	
						)}
						
						{enabledLayers.has("label") && (
							<Source id="text" type="geojson" data={data}>
								<Layer
									id="labels"
									type="symbol"
									minzoom={7}
									layout={{
										'text-field': ['get', 'waypoint_id'],
										'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
										'text-size': 11.5,
										'text-offset': [0, 1],
										'text-anchor': 'top',
										'icon-text-fit': 'none',
									}}
									paint={{
										"text-opacity": 0.85,
										'text-color': theme === "dark"
											? "#ffffff"
											: "#000000",
									}}
								/>
							</Source>
						)}
					</>
				)}
			</Map>
		</div>
	)
}