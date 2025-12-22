import mapboxgl from 'mapbox-gl';
import Map from "react-map-gl/mapbox";

import { useTheme } from 'next-themes';
import { useTfrInteractivity } from "./store";
import { useMobile } from '../mobile-provider';
import { TfrGeoJson } from "~/lib/aviation/tfr";
import { useEffect, useMemo, useRef } from "react";
import { Layer, MapRef, Source } from "react-map-gl/mapbox";
import { AttributionControl, NavigationControl } from "react-map-gl/mapbox";

const layerStyle = {
	lineColor: "#ff4444",
	fillColor: "#ff4444",
	textColor: "#cc0000",
};

function epsg3857to4326(x: number, y: number): [number, number] {
	const lng = (x * 180) / 20037508.34;
	const lat = (Math.atan(Math.exp((y * Math.PI) / 20037508.34)) * 360) / Math.PI - 90;
	return [lng, lat];
}

// Transform GeoJSON from EPSG:3857 -> EPSG:4326
const convertGeoJson = (geo: TfrGeoJson) => ({
	...geo,
	features: geo.features.map((feature) => ({
		...feature,
		geometry: {
			...feature.geometry,
			coordinates: feature.geometry.coordinates.map((ring) =>
				ring.map(([x, y]) => epsg3857to4326(x, y))
			),
		},
	})),
})

const bbox = (geo: TfrGeoJson, notamId: string): mapboxgl.LngLatBounds | null => {
	const feature = geo.features.find(f => f.properties.NOTAM_KEY.split('-')[0] === notamId);
	if (!feature) return null;

	const [minLng, minLat] = feature.geometry.coordinates.reduce(
		([minLng, minLat], ring) => [
			Math.min(minLng, ...ring.map(([lng]) => lng)),
			Math.min(minLat, ...ring.map(([, lat]) => lat)),
		],
		[Infinity, Infinity]
	);

	const [maxLng, maxLat] = feature.geometry.coordinates.reduce(
		([maxLng, maxLat], ring) => [
			Math.max(maxLng, ...ring.map(([lng]) => lng)),
			Math.max(maxLat, ...ring.map(([, lat]) => lat)),
		],
		[-Infinity, -Infinity]
	);

	return new mapboxgl.LngLatBounds(
		[minLng, minLat],
		[maxLng, maxLat]
	);
}

const desktopInitialView = {
	latitude: 39,
	longitude: -98,
	zoom: 3.5
};

const mobileInitialView = {
	latitude: 37.833333,
	longitude: -97.583333,
	zoom: 2.15
};

export const TfrMapSkeletonLoader = () => (
	<div className="w-full min-h-[40vh] h-full relative overflow-hidden">
		<div className="absolute inset-0 bg-muted animate-pulse" />
	</div>
);

export const TfrMap: React.FC<{ geo: TfrGeoJson }> = ({ geo }) => {
	const mapRef = useRef<MapRef>(null);
	const convertedGeo = useMemo(() => convertGeoJson(geo), [geo]);

	const { mobile, pending } = useMobile();
	const { active } = useTfrInteractivity();
	const { resolvedTheme: theme } = useTheme();

	useEffect(() => {
		if (!active) {
			const view = mobile
				? mobileInitialView
				: desktopInitialView;
			
			mapRef.current?.flyTo({
				center: [
					view.longitude,
					view.latitude
				],
				zoom: view.zoom,
				duration: 1000
			});

			return;
		}

		const center = bbox(convertedGeo, active.notam_id);
		if (!center) return;

		mapRef.current?.fitBounds(center, {
			padding: mobile ? 50 : 200,
			maxZoom: mobile ? 8 : 10,
			duration: 1000
		});
	}, [active, mobile, convertedGeo]);
	
	if (pending) return <TfrMapSkeletonLoader />;
	if (mobile) return (
		<div className="w-full h-[40vh] relative overflow-hidden border-x border-t">
			<Map
				ref={mapRef}
				mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
				initialViewState={mobileInitialView}
				projection="mercator"
				attributionControl={false}
				style={{ width: "100%", height: "40vh" }}
				mapStyle={
					theme === "light"
						? "mapbox://styles/mapbox/light-v11"
						: "mapbox://styles/mapbox/dark-v11"
				}
			>
				<NavigationControl position="top-right" />
				<AttributionControl
					compact
					customAttribution="Skywatch (c) 2025"
					style={{
						color: "black",
						fontSize: "12px",
						fontFamily: "monospace",
					}}
				/>

				<Source type="geojson" data={convertedGeo}>
					{/* Fill layer for the TFR polygons */}
					<Layer
						id="tfr-fill"
						type="fill"
						paint={{
							'fill-color': layerStyle.fillColor,
							'fill-opacity': 0.2
						}}
					/>

					{/* Outline layer for the TFR polygons */}
					<Layer
						id="tfr-line"
						type="line"
						paint={{
							'line-color': layerStyle.lineColor,
							'line-width': 2,
							'line-opacity': 0.8
						}}
					/>

					{/* Label layer for TFR identifiers */}
					{/*<Layer
						id="tfr-label"
						type="symbol"
						layout={{
							'text-field': ['get', 'TITLE'],
							'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
							'text-size': 12,
							'symbol-placement': 'point',
							'text-anchor': 'center',
							'text-max-width': 10
						}}
						paint={{
							'text-color': layerStyle.textColor,
							'text-halo-color': '#ffffff',
							'text-halo-width': 1
						}}
					/>*/}
				</Source>
			</Map>
		</div>
	)

	return (
		<div className="w-full h-[40vh] relative overflow-hidden border-x border-t">
			<Map
				ref={mapRef}
				mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
				initialViewState={desktopInitialView}
				projection="mercator"
				attributionControl={false}
				style={{ width: "100%", height: "40vh" }}
				mapStyle={
					theme === "light"
						? "mapbox://styles/mapbox/light-v11"
						: "mapbox://styles/mapbox/dark-v11"
				}
			>
				<NavigationControl position="top-right" />
				<AttributionControl
					compact
					customAttribution="Skywatch (c) 2025"
					style={{
						color: "black",
						fontSize: "12px",
						fontFamily: "monospace",
					}}
				/>

				<Source type="geojson" data={convertedGeo}>
					{/* Fill layer for the TFR polygons */}
					<Layer
						id="tfr-fill"
						type="fill"
						paint={{
							'fill-color': layerStyle.fillColor,
							'fill-opacity': 0.2
						}}
					/>

					{/* Outline layer for the TFR polygons */}
					<Layer
						id="tfr-line"
						type="line"
						paint={{
							'line-color': layerStyle.lineColor,
							'line-width': 2,
							'line-opacity': 0.8
						}}
					/>

					{/* Label layer for TFR identifiers */}
					{/*<Layer
						id="tfr-label"
						type="symbol"
						layout={{
							'text-field': ['get', 'TITLE'],
							'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
							'text-size': 12,
							'symbol-placement': 'point',
							'text-anchor': 'center',
							'text-max-width': 10
						}}
						paint={{
							'text-color': layerStyle.textColor,
							'text-halo-color': '#ffffff',
							'text-halo-width': 1
						}}
					/>*/}
				</Source>
			</Map>
		</div>
	);
};
