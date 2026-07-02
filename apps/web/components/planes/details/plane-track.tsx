import { Source, Layer } from "react-map-gl/mapbox";
import { GeoJson } from "~/lib/geo";

const altitudeToColor = (altitudeFt: number) => {
	const minAlt = 0;
	const maxAlt = 40000;

	// Clamp altitude to range [0, 40000]
	const clampedAlt = Math.max(minAlt, Math.min(maxAlt, altitudeFt));

	// Normalize to 0-1 range
	const normalized = (clampedAlt - minAlt) / (maxAlt - minAlt);

	// Red: #FF0000, Purple: #8B00FF
	// Interpolate: R stays high, G goes 0→0, B goes 0→FF
	const red = Math.round(255 - normalized * (255 - 139)); // 255 to 139
	const green = 0;
	const blue = Math.round(normalized * 255); // 0 to 255

	return `#${red.toString(16).padStart(2, '0')}${green.toString(16).padStart(2, '0')}${blue.toString(16).padStart(2, '0')}`;
}

interface TrackPoint {
	lat: number;
	lon: number;
	alt: number;
}

export const PlaneTrail: React.FC<{ track: TrackPoint[] }> = ({ track }) => {
	if (track.length < 2) {
		return null;
	}

	const coordinates = track.map((point) => [point.lon, point.lat]);
	const colorStops: any[] = [];
	track.forEach((point, index) => {
		const progress = index / (track.length - 1);
		colorStops.push(progress);
		colorStops.push(altitudeToColor(point.alt));
	});

	const geojson: GeoJson<any, "LineString", number[][]> = {
		type: "FeatureCollection",
		features: [
			{
				type: 'Feature',
				geometry: {
					type: 'LineString',
					coordinates,
				},
				properties: {},
			},
		],
	};

	return (
		<Source
			id="plane-trail"
			type="geojson"
			data={geojson}
			lineMetrics
		>
			<Layer
				id="plane-trail-line"
				type="line"
				paint={{
					'line-color': '#888',
					'line-width': 3,
					'line-gradient': ['interpolate', ['linear'], ['line-progress'], ...colorStops],
					'line-opacity': 0.8,
				}}
				layout={{
					'line-join': 'round',
					'line-cap': 'round',
				}}
			/>
		</Source>
	);
}
