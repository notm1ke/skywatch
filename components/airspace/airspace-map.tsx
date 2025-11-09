import Map from "react-map-gl/mapbox";
import Boundaries from '~/geojson/airspaces.json';

import { useMemo } from "react";
import { cn } from "~/lib/utils";
import { GeoJson } from "~/lib/geo";
import { useTheme } from "next-themes";
import { useAirspace } from "./provider";
import { AirportAdvisory } from "~/lib/faa";
import { Marker } from "react-map-gl/mapbox";
import { useAirports } from "../airport-provider";
import { AirportWithJoins } from "~/lib/airports";
import { AttributionControl, Layer, NavigationControl, Source } from "react-map-gl/mapbox";

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

type AirportStatus =
	| "normal"
	| "ground_stop"
	| "ground_delay"
	| "ops_delay"
	| "airport_closure"
	| "freeform";
	
const colorForAirportStatus = (status: AirportStatus) => {
	switch (status) {
		case "airport_closure": return "bg-red-400";
		case "ground_delay": return "bg-yellow-400";
		case "ops_delay": return "bg-yellow-400";
		case "ground_stop": return "bg-orange-400";
		case "freeform": return "bg-blue-400";
		default: return "bg-green-400";
	}
}

const AirportMarker: React.FC<{ advisory: AirportAdvisory, airport: AirportWithJoins }> = ({ advisory, airport }) => {
	const status: AirportStatus = useMemo(() => {
		if (advisory.airportClosure) return "airport_closure";
		if (advisory.groundDelay) return "ground_delay";
		if (advisory.arrivalDelay || advisory.departureDelay) return "ops_delay";
		if (advisory.groundStop) return "ground_stop";
		if (advisory.freeForm) return "freeform";
		return "normal";
	}, [advisory]);
	
	return (
		<Marker
			key={airport.iata_code}
			latitude={airport.latitude_deg}
			longitude={airport.longitude_deg}
		>
			<div className={cn("size-2.5 rounded-md", colorForAirportStatus(status))} />
		</Marker>
	)
}

export const AirspaceMap: React.FC = () => {
	const { airports } = useAirports();
	const { advisories } = useAirspace();
	const { resolvedTheme: theme } = useTheme();
	
	const centers = useMemo(() =>
		filterOnlyCenters(Boundaries as unknown as GeoJson<AirspaceProps>),
		[Boundaries]
	);
	
	const airportMarkers = useMemo(
		() => advisories
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
			.filter(Boolean),
		[advisories, airports]
	);
	
	return (
		<div className="w-full min-h-[600px] h-full relative overflow-hidden">
			<div className="absolute inset-0 bg-zinc-900/80">
				<Map
					mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
					initialViewState={{
						latitude: 40,
						longitude: -100,
						zoom: 3.25
					}}
					interactiveLayerIds={['airspace']}
					attributionControl={false}
					style={{ width: "100%", height: "600px" }}
					mapStyle={
						theme === 'dark'
							? 'mapbox://styles/mapbox/dark-v11'
							: 'mapbox://styles/mapbox/light-v11'
					}
				>
					<NavigationControl position="top-right" />
					<AttributionControl
						compact
						customAttribution="Airside (c) 2025"
						style={{
							color: "black",
							fontSize: "12px",
							fontFamily: "monospace",
						}}
					/>
					
					{airportMarkers}
					
					<Source type="geojson" data={centers}>
						<Layer
							{...{
								id: 'airspace',
								type: 'line',
								paint: {
									'line-color': [
										'match',
										['get', 'status'],
										'#cccccc',
										'#cccccc',
										'#cccccc'
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
							paint={{ 'text-color': '#ffffff' }}
						/>
					</Source>
				</Map>
			</div>
		</div>
	);
}