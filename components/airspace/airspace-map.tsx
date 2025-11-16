import Map from "react-map-gl/mapbox";
import Boundaries from '~/geojson/airspaces.json';

import { useMemo } from "react";
import { cn } from "~/lib/utils";
import { GeoJson } from "~/lib/geo";
import { useTheme } from "next-themes";
import { useAirspace } from "./provider";
import { Marker } from "react-map-gl/mapbox";
import { useAirports } from "../airport-provider";
import { AirportWithJoins } from "~/lib/airports";
import { AirportAdvisory, AirportStatus } from "~/lib/faa";
import { AirspaceMapHoverCard } from "./airspace-map-hover";
import { AttributionControl, Layer, NavigationControl, Source } from "react-map-gl/mapbox";
import { useIsMobile } from "~/hooks/use-mobile";

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

const AirportMarker: React.FC<{ advisory: AirportAdvisory, airport: AirportWithJoins }> = ({ advisory, airport }) => {
	const status: AirportStatus = useMemo(() => {
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
				status={status}
			>
				<div className={cn("size-2.5 rounded-md", colorForAirportStatus(status))} />
			</AirspaceMapHoverCard>
		</Marker>
	)
}

export const AirspaceMap: React.FC = () => {
	const { airports } = useAirports();
	const { advisories } = useAirspace();
	const { resolvedTheme: theme } = useTheme();
	
	const isMobile = useIsMobile();
	const centers = useMemo(() =>
		filterOnlyCenters(Boundaries as unknown as GeoJson<AirspaceProps>),
		[Boundaries]
	);
	
	const initialView = useMemo(() => {
		if (isMobile) return {
			latitude: 26.183575146480564,
			longitude: -97.46394501005533,
			zoom: 2.25
		};
		
		return {
			latitude: 40,
			longitude: -100,
			zoom: 3.25
		};
	}, [isMobile]);
	
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
	
	return (
		<div className="w-full min-h-[400px] sm:min-h-[600px] h-full relative overflow-hidden">
			<div className="absolute inset-0">
				<Map
					mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
					initialViewState={initialView}
					projection="mercator"
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
						customAttribution="Skywatch (c) 2025"
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
				</Map>
			</div>
		</div>
	);
}