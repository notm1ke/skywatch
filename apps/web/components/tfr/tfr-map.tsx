"use client";

import Map, { Layer, Source, type MapMouseEvent, type MapRef } from "react-map-gl/mapbox";

import { useTheme } from "next-themes";
import type { ExpressionSpecification, FilterSpecification } from "mapbox-gl";
import { useEffect, useMemo, useRef, useState } from "react";
import { MapControls } from "~/components/ui/map-controls";
import { useMobile } from "../mobile-provider";
import { useTfrControls } from "./store";
import { DOT_OPACITY, RING_RADIUS, colorExpression, type TfrIndex } from "./geo";
import { placeOf } from "./types";

const DESKTOP_VIEW = { latitude: 38.5, longitude: -96.5, zoom: 3.3 };
const MOBILE_VIEW = { latitude: 37.833333, longitude: -97.583333, zoom: 2.15 };

/** the lower 48: [[west, south], [east, north]] */
const US_BOUNDS: [[number, number], [number, number]] = [[-125.5, 24], [-66, 49.8]];

const SELECTED_COLOR = "#f59e0b";

// what a TFR is colored never changes: build it once
const COLOR = colorExpression();

// a ring's fill is a faint wash, gone with the ring once the outline is big enough to see
const RING_FILL_OPACITY: ExpressionSpecification = ["interpolate", ["linear"], ["zoom"], 3, 0.2, 7.5, 0.18, 9, 0];
const RING_OPACITY = RING_FILL_OPACITY;

// every layer a click or hover can land on
const INTERACTIVE_LAYERS = ["tfr-fill", "tfr-dot-hit"];

const FONT = ["Open Sans Bold", "Arial Unicode MS Bold"];

const filter = (expression: unknown) => expression as FilterSpecification;

// These never change. (Changing a layer's filter makes Mapbox reload every tile of its source. These sources are small,
// but the habit holds: nothing that changes on hover is a filter on the sources with every TFR in them. The hovered and
// the open TFR are drawn from a source of their own.)
const IS_HOVER = filter(["==", ["get", "kind"], "hover"]);
const IS_HOVER_DOT = filter(["==", ["get", "kind"], "hover-dot"]);
const IS_SELECTED = filter(["==", ["get", "kind"], "selected"]);
const IS_SELECTED_DOT = filter(["==", ["get", "kind"], "selected-dot"]);

type Kind = "hover" | "hover-dot" | "selected" | "selected-dot";

type Highlight = {
	type: "Feature";
	properties: { kind: Kind; place: string };
	geometry: { type: "Polygon"; coordinates: number[][][] } | { type: "Point"; coordinates: [number, number] };
};

type Props = {
	index: TfrIndex;
	/** the TFRs have arrived */
	ready: boolean;
};

export const TfrMap: React.FC<Props> = ({ index, ready }) => {
	const mapRef = useRef<MapRef>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const { resolvedTheme } = useTheme();
	const { mobile } = useMobile();
	const dark = resolvedTheme === "dark";

	const selectedId = useTfrControls(state => state.selectedId);
	const hoverId = useTfrControls(state => state.hoverId);
	const hiddenTypes = useTfrControls(state => state.hiddenTypes);
	const labels = useTfrControls(state => state.labels);
	const focus = useTfrControls(state => state.focus);

	const ink = dark ? "#e4e4e7" : "#27272a";
	const halo = dark ? "#0a0a0a" : "#ffffff";
	const view = mobile ? MOBILE_VIEW : DESKTOP_VIEW;

	// The only filter on the big sources: it changes when a type is switched off, not on hover or selection.
	const visible = filter(["!", ["in", ["get", "type"], ["literal", hiddenTypes]]]);

	// The hovered and the open TFR, as a source of their own: their outlines, and a dot where each is for when it's too
	// small to see.
	const highlights = useMemo(() => {
		const features: Highlight[] = [];

		const add = (id: string | null, outline: Kind, dot: Kind) => {
			const item = id ? index.items.get(id) : undefined;
			if (!id || !item) return;

			const place = placeOf(index.records.get(id)?.description ?? "");
			for (const polygon of index.outlines.get(id) ?? []) {
				features.push({ type: "Feature", properties: { kind: outline, place }, geometry: polygon.geometry });
			}
			features.push({ type: "Feature", properties: { kind: dot, place }, geometry: { type: "Point", coordinates: item.center } });
		};

		if (hoverId !== selectedId) add(hoverId, "hover", "hover-dot");
		add(selectedId, "selected", "selected-dot");

		return { type: "FeatureCollection" as const, features };
	}, [hoverId, selectedId, index]);

	// --- the map's size ---------------------------------------------------------------------------------------
	// The divider between the map and the table moves, and Mapbox only notices the window resizing.
	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const observer = new ResizeObserver(() => mapRef.current?.resize());
		observer.observe(container);
		return () => observer.disconnect();
	}, []);

	// --- moving the map -------------------------------------------------------------------------------------
	// A request to fly to a TFR (a row in the table, a link). It waits for the map and the TFRs, whichever comes last,
	// and each request runs once.
	const [loaded, setLoaded] = useState(false);
	const [home, setHome] = useState<typeof DESKTOP_VIEW | null>(null);
	const handled = useRef(0);

	useEffect(() => {
		const map = mapRef.current;
		const container = containerRef.current;
		if (!focus || !loaded || !map || !container || focus.token === handled.current) return;

		const item = index.items.get(focus.id);
		if (!item) return;

		handled.current = focus.token;

		// Leave room for the panel, which sits over the left of the map on a big screen and over the top on a small one.
		// Mapbox won't fit bounds into a padding bigger than the map, so the room is capped.
		const { clientWidth: width, clientHeight: height } = container;
		const padding = mobile
			? { top: Math.min(height * 0.45, 260), bottom: 24, left: 24, right: 24 }
			: { top: 48, bottom: 48, left: Math.min(416, width * 0.4), right: 56 };

		const [west, south, east, north] = item.bounds;
		map.fitBounds([[west, south], [east, north]], { padding, maxZoom: 9, duration: 1200 });
	}, [focus, index, loaded, mobile]);

	const reportView = () => {
		const bounds = mapRef.current?.getBounds();
		if (bounds) useTfrControls.getState().setView([bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()]);
	};

	// --- interaction ----------------------------------------------------------------------------------------
	// Outlines overlap (a stadium inside a security area). Of everything under the pointer, the smallest is the one meant.
	const tfrAt = (event: MapMouseEvent) => {
		let best: string | undefined;
		let bestArea = Infinity;

		for (const feature of event.features ?? []) {
			const id = feature.properties?.id as string | undefined;
			const area = id ? index.area.get(id) : undefined;
			if (id && area !== undefined && area < bestArea) {
				best = id;
				bestArea = area;
			}
		}

		return best;
	};

	const handleMove = (event: MapMouseEvent) => useTfrControls.getState().setHover(tfrAt(event) ?? null);

	const handleClick = (event: MapMouseEvent) => {
		const { select, clear, selectedId } = useTfrControls.getState();
		const id = tfrAt(event);

		if (id) return select(id);

		// a click on the background closes the panel
		if (selectedId) clear();
	};

	return (
		<div ref={containerRef} data-fullscreen={false} className="absolute inset-0 overflow-hidden">
			<Map
				ref={mapRef}
				mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
				initialViewState={view}
				projection="mercator"
				attributionControl={false}
				style={{ width: "100%", height: "100%" }}
				mapStyle={dark ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/light-v11"}
				// the layers don't exist until the TFRs arrive
				interactiveLayerIds={ready ? INTERACTIVE_LAYERS : undefined}
				cursor={hoverId ? "pointer" : ""}
				onLoad={() => {
					// Frame the lower 48 in whatever room the map has (its height changes with the divider and the screen),
					// and make that what the reset button goes back to.
					const map = mapRef.current;
					if (map) {
						map.fitBounds(US_BOUNDS, { padding: 24, duration: 0 });
						const center = map.getCenter();
						setHome({ latitude: center.lat, longitude: center.lng, zoom: map.getZoom() });
					}

					setLoaded(true);
					reportView();
				}}
				onMoveEnd={reportView}
				onMouseMove={handleMove}
				onMouseLeave={() => useTfrControls.getState().setHover(null)}
				onClick={handleClick}
			>
				<MapControls
					ref={containerRef}
					position={mobile ? "bottom-right" : "top-right"}
					orientation={mobile ? "horizontal" : undefined}
					initialView={home ?? view}
					showFullscreen
					showReset
				/>

				{ready && (
					<>
						{/* the outlines, in their type's color; the rest step back while one is open */}
						<Source id="tfr-shapes" type="geojson" data={index.polygons}>
							<Layer
								id="tfr-fill"
								type="fill"
								filter={visible}
								paint={{ "fill-color": COLOR, "fill-opacity": selectedId ? 0.07 : 0.22 }}
							/>
							<Layer
								id="tfr-line"
								type="line"
								filter={visible}
								paint={{ "line-color": COLOR, "line-width": 2, "line-opacity": selectedId ? 0.35 : 0.9 }}
							/>
						</Source>

						{/* a ring around each: a stadium's TFR is a speck at this scale. They fade out as the outlines become shapes. */}
						<Source id="tfr-dots" type="geojson" data={index.dots}>
							<Layer
								id="tfr-ring"
								type="circle"
								filter={visible}
								paint={{
									"circle-radius": RING_RADIUS,
									"circle-color": COLOR,
									"circle-opacity": RING_FILL_OPACITY,
									"circle-stroke-width": 2,
									"circle-stroke-color": COLOR,
									"circle-stroke-opacity": DOT_OPACITY
								}}
							/>
							<Layer
								id="tfr-dot"
								type="circle"
								filter={visible}
								paint={{
									"circle-radius": 2.2,
									"circle-color": COLOR,
									"circle-opacity": DOT_OPACITY
								}}
							/>

							{/* near-invisible and bigger than the dots: the pointer doesn't have to be exact */}
							<Layer
								id="tfr-dot-hit"
								type="circle"
								maxzoom={9}
								filter={visible}
								paint={{ "circle-radius": 12, "circle-color": "#000000", "circle-opacity": 0.01 }}
							/>

							{labels && (
								<Layer
									id="tfr-labels"
									type="symbol"
									minzoom={5.5}
									filter={visible}
									layout={{
										"text-field": ["get", "place"],
										"text-font": FONT,
										"text-size": 11.5,
										"text-offset": [0, 1],
										"text-anchor": "top",
										"text-max-width": 9
									}}
									paint={{ "text-opacity": 0.85, "text-color": ink, "text-halo-color": halo, "text-halo-width": 1.2 }}
								/>
							)}
						</Source>

						{/* The hovered and the open TFR, above everything else. The open one is always shown, whatever the
						    filters and zoom say. */}
						<Source id="tfr-highlights" type="geojson" data={highlights}>
							<Layer
								id="tfr-hover-line"
								type="line"
								filter={IS_HOVER}
								paint={{ "line-color": ink, "line-width": 2.5 }}
							/>
							<Layer
								id="tfr-hover-dot"
								type="circle"
								filter={IS_HOVER_DOT}
								paint={{ "circle-radius": 13, "circle-opacity": 0, "circle-stroke-width": 2, "circle-stroke-color": ink }}
							/>
							<Layer
								id="tfr-selected-fill"
								type="fill"
								filter={IS_SELECTED}
								paint={{ "fill-color": SELECTED_COLOR, "fill-opacity": 0.18 }}
							/>
							<Layer
								id="tfr-selected-line"
								type="line"
								filter={IS_SELECTED}
								paint={{ "line-color": SELECTED_COLOR, "line-width": 3 }}
							/>
							<Layer
								id="tfr-selected-ring"
								type="circle"
								filter={IS_SELECTED_DOT}
								paint={{
									"circle-radius": 12,
									"circle-color": SELECTED_COLOR,
									"circle-opacity": RING_OPACITY,
									"circle-stroke-width": 2.5,
									"circle-stroke-color": SELECTED_COLOR,
									"circle-stroke-opacity": DOT_OPACITY
								}}
							/>
							<Layer
								id="tfr-selected-dot"
								type="circle"
								filter={IS_SELECTED_DOT}
								paint={{
									"circle-radius": 4.5,
									"circle-color": SELECTED_COLOR,
									"circle-stroke-width": 1.5,
									"circle-stroke-color": halo,
									"circle-opacity": DOT_OPACITY,
									"circle-stroke-opacity": DOT_OPACITY
								}}
							/>
							<Layer
								id="tfr-selected-label"
								type="symbol"
								filter={IS_SELECTED_DOT}
								layout={{
									"text-field": ["get", "place"],
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
