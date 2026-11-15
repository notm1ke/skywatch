"use client";

import Map, { Layer, Source, type MapMouseEvent, type MapRef } from "react-map-gl/mapbox";

import { MapIcon } from "lucide-react";
import { useTheme } from "next-themes";
import type { FilterSpecification } from "mapbox-gl";
import { useEffect, useMemo, useRef, useState } from "react";
import { MapControls } from "~/components/ui/map-controls";
import { Button } from "../ui/button";
import { useMobile } from "../mobile-provider";
import { MapStyleSelector } from "./style-selector";
import { WaypointMapStyleLayer } from "./style-layer";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { useWaypointControls } from "./store";
import { useWaypointUsage } from "./use-usage";
import { airwayLines, colorExpression, radiusExpression, type WaypointIndex } from "./geo";

const INITIAL_VIEW = { latitude: 37.833333, longitude: -97.583333, zoom: 4.15 };

const SELECTED_COLOR = "#f59e0b";

// the dots' size and color don't depend on anything that changes: build them once
const RADIUS = radiusExpression();
const HIT_RADIUS = radiusExpression(5);
const COLOR = colorExpression();

// every layer a click or hover can land on
const INTERACTIVE_LAYERS = ["wp-hit"];

const FONT = ["Open Sans Bold", "Arial Unicode MS Bold"];

const filter = (expression: unknown) => expression as FilterSpecification;

// These never change. (Changing a layer's filter makes Mapbox reload every tile of its source: fine for a source
// with one or two points in it, a stutter for one with 70k. So nothing that changes on hover is a filter on the
// waypoints source: the highlights live in a source of their own.)
const IS_HOVER = filter(["==", ["get", "kind"], "hover"]);
const IS_SELECTED = filter(["==", ["get", "kind"], "selected"]);

type Highlight = {
	type: "Feature";
	properties: { id: string; kind: "hover" | "selected" };
	geometry: { type: "Point"; coordinates: [number, number] };
};

type Props = {
	index: WaypointIndex;
	/** the points have arrived */
	ready: boolean;
};

export const WaypointMap: React.FC<Props> = ({ index, ready }) => {
	const mapRef = useRef<MapRef>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const { resolvedTheme } = useTheme();
	const { mobile } = useMobile();
	const dark = resolvedTheme === "dark";

	const selectedId = useWaypointControls(state => state.selectedId);
	const hoverId = useWaypointControls(state => state.hoverId);
	const hoverAirway = useWaypointControls(state => state.hoverAirway);
	const hiddenTypes = useWaypointControls(state => state.hiddenTypes);
	const labels = useWaypointControls(state => state.labels);
	const focus = useWaypointControls(state => state.focus);

	const { data: usage } = useWaypointUsage(selectedId);
	const airways = useMemo(() => airwayLines(usage), [usage]);

	const ink = dark ? "#e4e4e7" : "#27272a";
	const halo = dark ? "#0a0a0a" : "#ffffff";

	// The only filter on the big source: it changes when a type is switched off, not on hover or selection.
	const visible = filter(["!", ["in", ["get", "t"], ["literal", hiddenTypes]]]);
	const hoveredAirway = filter(["==", ["get", "id"], hoverAirway ?? ""]);

	// The hovered and the open waypoint, as a source of their own that holds at most two points.
	const highlights = useMemo(() => {
		const features: Highlight[] = [];

		const add = (id: string | null, kind: "hover" | "selected") => {
			const at = id ? index.coords.get(id) : undefined;
			if (id && at) features.push({ type: "Feature", properties: { id, kind }, geometry: { type: "Point", coordinates: at } });
		};

		if (hoverId !== selectedId) add(hoverId, "hover");
		add(selectedId, "selected");

		return { type: "FeatureCollection" as const, features };
	}, [hoverId, selectedId, index]);

	// --- moving the map -------------------------------------------------------------------------------------
	// A request to fly somewhere (a search result, a link, "Jump to"). It waits for the map and the points, whichever
	// comes last, and each request runs once.
	const [loaded, setLoaded] = useState(false);
	const handled = useRef(0);

	useEffect(() => {
		const map = mapRef.current;
		if (!focus || !loaded || !map || focus.token === handled.current) return;

		const at = index.coords.get(focus.id);
		if (!at) return;

		handled.current = focus.token;
		map.flyTo({ center: at, zoom: focus.zoom, duration: 1500 });
	}, [focus, index, loaded]);

	// --- interaction ----------------------------------------------------------------------------------------
	const waypointAt = (event: MapMouseEvent) =>
		event.features?.find(feature => feature.layer?.id === "wp-hit")?.properties?.id as string | undefined;

	const handleMove = (event: MapMouseEvent) => useWaypointControls.getState().setHover(waypointAt(event) ?? null);

	const handleClick = (event: MapMouseEvent) => {
		const { select, clear, selectedId } = useWaypointControls.getState();
		const id = waypointAt(event);

		if (id) return select(id);

		// a click on the background closes the panel
		if (selectedId) clear();
	};

	return (
		<div ref={containerRef} data-fullscreen={false} className="absolute inset-0 overflow-hidden">
			<Map
				ref={mapRef}
				mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
				initialViewState={INITIAL_VIEW}
				projection="mercator"
				attributionControl={false}
				style={{ width: "100%", height: "100%" }}
				mapStyle={dark ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/light-v11"}
				// the layers don't exist until the points arrive
				interactiveLayerIds={ready ? INTERACTIVE_LAYERS : undefined}
				cursor={hoverId ? "pointer" : ""}
				onLoad={() => setLoaded(true)}
				onMouseMove={handleMove}
				onMouseLeave={() => useWaypointControls.getState().setHover(null)}
				onClick={handleClick}
			>
				<MapControls
					ref={containerRef}
					position={mobile ? "bottom-right" : "top-right"}
					orientation={mobile ? "horizontal" : undefined}
					initialView={INITIAL_VIEW}
					showFullscreen
					showReset
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

				<WaypointMapStyleLayer />

				{ready && (
					<>
						{/* the airways through the open waypoint, under the dots */}
						<Source id="airways" type="geojson" data={airways}>
							<Layer
								id="airways-casing"
								type="line"
								layout={{ "line-cap": "round", "line-join": "round" }}
								paint={{ "line-color": halo, "line-width": 5, "line-opacity": 0.8 }}
							/>
							<Layer
								id="airways-line"
								type="line"
								layout={{ "line-cap": "round", "line-join": "round" }}
								paint={{ "line-color": ["get", "color"], "line-width": 2.5, "line-opacity": hoverAirway ? 0.35 : 0.9 }}
							/>
							<Layer
								id="airways-hover"
								type="line"
								filter={hoveredAirway}
								layout={{ "line-cap": "round", "line-join": "round" }}
								paint={{ "line-color": ["get", "color"], "line-width": 5, "line-opacity": 1 }}
							/>
							<Layer
								id="airways-label"
								type="symbol"
								layout={{
									"symbol-placement": "line",
									"symbol-spacing": 280,
									"text-field": ["get", "id"],
									"text-font": FONT,
									"text-size": 12
								}}
								paint={{ "text-color": ink, "text-halo-color": halo, "text-halo-width": 2 }}
							/>
						</Source>

						<Source id="waypoints" type="geojson" data={index.collection}>
							<Layer
								id="wp-points"
								type="circle"
								filter={visible}
								paint={{ "circle-radius": RADIUS, "circle-color": COLOR, "circle-opacity": 0.85 }}
							/>

							{/* near-invisible and bigger than the dots: the pointer doesn't have to be exact */}
							<Layer
								id="wp-hit"
								type="circle"
								filter={visible}
								paint={{ "circle-radius": HIT_RADIUS, "circle-color": "#000000", "circle-opacity": 0.01 }}
							/>

							{labels && (
								<Layer
									id="wp-labels"
									type="symbol"
									minzoom={8}
									filter={visible}
									layout={{
										"text-field": ["get", "id"],
										"text-font": FONT,
										"text-size": 11.5,
										"text-offset": [0, 1],
										"text-anchor": "top"
									}}
									paint={{ "text-opacity": 0.85, "text-color": ink, "text-halo-color": halo, "text-halo-width": 1.2 }}
								/>
							)}
						</Source>

						{/* The hovered and the open waypoint, above everything else. The open one is always shown,
						    whatever the filters and zoom say, and its label wins over the regular one under it. */}
						<Source id="highlights" type="geojson" data={highlights}>
							<Layer
								id="wp-hover"
								type="circle"
								filter={IS_HOVER}
								paint={{ "circle-radius": 9, "circle-opacity": 0, "circle-stroke-width": 2, "circle-stroke-color": ink }}
							/>
							<Layer
								id="wp-selected-ring"
								type="circle"
								filter={IS_SELECTED}
								paint={{ "circle-radius": 12, "circle-color": SELECTED_COLOR, "circle-opacity": 0.18, "circle-stroke-width": 2.5, "circle-stroke-color": SELECTED_COLOR }}
							/>
							<Layer
								id="wp-selected-dot"
								type="circle"
								filter={IS_SELECTED}
								paint={{ "circle-radius": 4.5, "circle-color": SELECTED_COLOR, "circle-stroke-width": 1.5, "circle-stroke-color": halo }}
							/>
							<Layer
								id="wp-selected-label"
								type="symbol"
								filter={IS_SELECTED}
								layout={{
									"text-field": ["get", "id"],
									"text-font": FONT,
									"text-size": 13,
									"text-offset": [0, 1.6],
									"text-anchor": "top",
									"text-allow-overlap": true
								}}
								paint={{ "text-color": ink, "text-halo-color": halo, "text-halo-width": 1.6 }}
							/>
						</Source>
					</>
				)}
			</Map>
		</div>
	);
};
