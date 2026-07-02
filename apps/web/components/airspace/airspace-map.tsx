import mapboxgl from "mapbox-gl";
import Map from "react-map-gl/mapbox";
import Boundaries from "~/geojson/airspaces.json";

import { z } from "zod/v4";
import { cn } from "cnfast";
import { bbox } from "@turf/turf";
import { GeoJson } from "~/lib/geo";
import { motion } from "motion/react";
import { useTheme } from "next-themes";
import { useAirspace } from "./provider";
import { useMobile } from "../mobile-provider";
import { AirportAdvisory } from "~/lib/schemas";
import { useAirports } from "../airport-provider";
import { useAirspaceInteractivity } from "./store";
import { AirspaceMapHoverCard } from "./airspace-map-hover";
import { MapControls, MapLayers } from "../ui/map-controls";
import { useEffect, useMemo, useRef, useState } from "react";
import { Layer, MapRef, Marker, Source } from "react-map-gl/mapbox";
import { AirportStatus, AirportWithJoins, Airspaces } from "@skywatch/gateway/schemas";

type AirportStatus = z.infer<typeof AirportStatus>;

type AirspaceProps = {
	GLOBAL_ID: string;
	IDENT: string;
	NAME: string;
	TYPE_CODE: string;
	CLASS: string | null;
	LOCAL_TYPE: string | null;
	ICAO_ID: string | null;
	SECTOR: string | null;
	LEVEL_: string;
	UPPER_DESC: string | null;
	UPPER_VAL: number;
	UPPER_UOM: string | null;
	UPPER_CODE: string | null;
	LOWER_DESC: string | null;
	LOWER_VAL: number;
	LOWER_UOM: string | null;
	LOWER_CODE: string | null;
	COMM_NAME: string | null;
	ONSHORE: number | null;
	EXCLUSION: number | null;
	WKHR_CODE: string | null;
	WKHR_RMK: string | null;
	CITY: string | null;
	STATE: string | null;
	COUNTRY: string | null;
	ADHP_ID: string | null;
	MIL_CODE: string;
	REMARKS: string | null;
	AK_LOW: number | null;
	AK_HIGH: number | null;
	US_LOW: number | null;
	US_HIGH: number | null;
	US_AREA: number | null;
	PACIFIC: number | null;
	Shape__Area: number;
	Shape__Length: number;
}

const filterOnlyCenters = (geojson: GeoJson<AirspaceProps>) => ({
	...geojson,
	features: geojson
		.features
		.filter(feature => feature.properties.TYPE_CODE === 'ARTCC')
});
	
const colorForAirportStatus = (status: AirportStatus) => {
	switch (status) {
		case "airport_closure": return "bg-red-400";
		case "ground_stop": return "bg-orange-400";
		case "ground_delay": return "bg-yellow-400";
		case "ops_delay": return "bg-yellow-400";
		case "freeform": return "bg-blue-400";
		case "deicing": return "bg-blue-400";
		default: return "bg-green-400";
	}
}

const bboxFeature = (geo: GeoJson<AirspaceProps>, airspace: string): mapboxgl.LngLatBounds | null => {  
	const feature = geo.features.find(f => f.properties.IDENT.toLowerCase() === airspace.toLowerCase());  
	if (!feature) return null;  
	const bboxArray = bbox(feature);  
	return new mapboxgl.LngLatBounds(  
		[bboxArray[0], bboxArray[1]],  
		[bboxArray[2], bboxArray[3]]  
	);  
};

const AirportMarker: React.FC<{ advisory?: AirportAdvisory, airport: AirportWithJoins }> = ({ advisory, airport }) => {
	const status: AirportStatus = useMemo(() => {
		if (!advisory) return "normal";
		if (advisory.airportClosure) return "airport_closure";
		if (advisory.groundStop) return "ground_stop";
		if (advisory.groundDelay) return "ground_delay";
		if (advisory.arrivalDelay || advisory.departureDelay) return "ops_delay";
		if (advisory.freeForm) return "freeform";
		if (advisory.deicing) return "deicing";
		return "normal";
	}, [advisory]);
	
	return (
		<Marker
			key={airport.iata_code}
			latitude={airport.latitude_deg}
			longitude={airport.longitude_deg}
			className="cursor-help"
		>
			<AirspaceMapHoverCard
				advisory={advisory}
				airport={airport}
			>
				<motion.div
					className={cn("size-2.5 rounded-md", colorForAirportStatus(status))}
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.5 }}
				/>
			</AirspaceMapHoverCard>
		</Marker>
	)
}

export const AirspaceMap: React.FC = () => {
	const { airports } = useAirports();
	const { advisories } = useAirspace();
	const { mobile, pending } = useMobile();
	const { resolvedTheme: theme } = useTheme();
	const { active } = useAirspaceInteractivity();
	
	const boundaries = Boundaries as unknown as GeoJson<AirspaceProps>;
	const mapRef = useRef<MapRef>(null);
	const mapContainerRef = useRef<HTMLDivElement>(null);
	const layers: MapLayers = [
		{
			key: "airspace",
			name: "Airspaces",
			color: "var(--color-zinc-500)",
			count: Airspaces.length,
		},
		{
			key: "advisory",
			name: "Advisories",
			color: "var(--color-green-500)",
			count: advisories.length,
		},
	];
	
	const centers = useMemo(() =>
		filterOnlyCenters(boundaries),
		[boundaries]
	);
	
	const [enabledLayers, setEnabledLayers] = useState<Set<string>>(
		() => new Set<string>(
			layers
				.filter(layer => layer.defaultState === undefined || layer.defaultState === true)
				.map(layer => layer.key)
		)
	);
	
	const airportMarkers = useMemo(
		() => {
			const statusMarkers = advisories
				.map(advisory => {
					const airport = airports.find(a => a.iata_code === advisory.airportId);
					if (!airport) return null;
					
					return (
						<AirportMarker
							key={advisory.airportId}
							advisory={advisory}
							airport={airport}
						/>
					);
				})
				.filter(Boolean);

			if (active === "any") return statusMarkers;
			const artccAirports = airports.filter(airport => airport.artcc === active);
			return [...statusMarkers, ...artccAirports.map(airport => (
				<AirportMarker
					key={airport.iata_code}
					advisory={null}
					airport={airport}
				/>
			))]
		},
		[advisories, airports, active]
	);
	
	const layerStyle = useMemo(() => {
		const colors = {
			dark: {
				textColor: '#ffffff',
				lineColor: '#cccccc'
			},
			light: {
				textColor: '#262828',
				lineColor: '#424242'
			}
		};
		
		return colors[theme as keyof typeof colors] ?? colors.dark;
	}, [theme]);

	const initialView = {
		mobile: {
			latitude: 37.833333,
			longitude: -97.583333,
			zoom: 2.15
		},
		desktop: {
			latitude: 37,
			longitude: -97.5,
			zoom: 3.25
		}
	}

	useEffect(() => {
		if (active === "any") {
			mapRef.current?.flyTo({
				center: [initialView.desktop.longitude, initialView.desktop.latitude],
				zoom: initialView.desktop.zoom
			});
			return;
		}

		const bounding = bboxFeature(centers, active);
		if (!bounding) return;
		
		mapRef.current?.fitBounds(bounding, {
			padding: { top: 15, bottom: 15, left: 15, right: 15 }
		});
	}, [active]);
	
	if (pending) return (
		<div className="w-full min-h-[300px] sm:min-h-[600px] h-full relative overflow-hidden">
			<div className="absolute inset-0 bg-muted animate-pulse" />
		</div>
	);

	if (mobile) return (
		<div
			ref={mapContainerRef}
			className="w-full relative overflow-hidden data-[fullscreen='true']:h-screen data-[fullscreen='false']:h-[300px]"
			data-fullscreen={false}
		>
			<div className="absolute inset-0">
				<Map
					ref={mapRef}
					mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
					initialViewState={initialView.mobile}
					projection="mercator"
					attributionControl={false}
					interactiveLayerIds={['airspace']}
					style={{ width: "100%" }}
					mapStyle={
						theme === 'dark'
							? 'mapbox://styles/mapbox/dark-v11'
							: 'mapbox://styles/mapbox/light-v11'
					}
				>
					<MapControls
						ref={mapContainerRef}
						position="bottom-right"
						orientation="horizontal"
						initialView={{
							latitude: 37.833333,
							longitude: -97.583333,
							zoom: 2.15
						}}
						layers={layers}
						layerState={enabledLayers}
						syncLayers={setEnabledLayers}
						showFullscreen
						showReset
					/>
					
					{enabledLayers.has("advisory") && airportMarkers}
					
					{enabledLayers.has("airspace") && (
						<Source type="geojson" data={centers}>
							<Layer
								{...{
									id: 'airspace',
									type: 'line',
									paint: {
										'line-color': [
											'match',
											['get', 'status'],
											layerStyle.lineColor,
											layerStyle.lineColor,
											layerStyle.lineColor
										],
										'line-opacity': 0.2
									}
								}}
							/>
							
							<Layer
								id="airspace-label"
								type="symbol"
								layout={{
									'text-field': ['get', 'IDENT'],
									'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
									'text-size': 14,
									'symbol-placement': 'point'
								}}
								paint={{ 'text-color': layerStyle.textColor }}
							/>
						</Source>
					)}
				</Map>
			</div>
		</div>
	);
	
	return (
		<div
			ref={mapContainerRef}
			data-fullscreen={false}
			className="w-full data-[fullscreen='true']:h-screen data-[fullscreen='false']:min-h-[400px] sm:data-[fullscreen='false']:min-h-[600px] h-full relative overflow-hidden"
		>
			<div className="absolute inset-0">
				<Map
					ref={mapRef}
					mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
					initialViewState={{
						latitude: 37,
						longitude: -97.5,
						zoom: 3.25
					}}
					projection="mercator"
					interactiveLayerIds={['airspace']}
					attributionControl={false}
					style={{ width: "100%" }}
					mapStyle={
						theme === 'dark'
							? 'mapbox://styles/mapbox/dark-v11'
							: 'mapbox://styles/mapbox/light-v11'
					}
				>
					<MapControls
						ref={mapContainerRef}
						position="top-right"
						initialView={initialView.desktop}
						layers={layers}
						layerState={enabledLayers}
						syncLayers={setEnabledLayers}
						showFullscreen
						showReset
					/>
					
					{enabledLayers.has("advisory") && airportMarkers}
					
					{enabledLayers.has("airspace") && (
						<Source type="geojson" data={centers}>
							<Layer
								{...{
									id: 'airspace',
									type: 'line',
									paint: {
										'line-color': [
											'match',
											['get', 'status'],
											layerStyle.lineColor,
											layerStyle.lineColor,
											layerStyle.lineColor
										],
										'line-opacity': 0.2
									}
								}}
							/>
							
							<Layer
								id="airspace-label"
								type="symbol"
								layout={{
									'text-field': ['get', 'IDENT'],
									'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
									'text-size': 14,
									'symbol-placement': 'point'
								}}
								paint={{ 'text-color': layerStyle.textColor }}
							/>
						</Source>
					)}
				</Map>
			</div>
		</div>
	);
}