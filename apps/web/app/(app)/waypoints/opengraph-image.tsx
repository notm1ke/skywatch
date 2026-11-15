import mapCoords from "~/geojson/dotted-map.json";
import waypointData from "~/geojson/og-waypoints.json";

import { geoMercator } from "d3-geo";
import { ImageResponse } from "next/og";
import { typeInfo } from "~/components/waypoints/types";

export const size = {
	width: 800,
	height: 400,
};

export const contentType = "image/png";

type PixelProps = {
	x: number;
	y: number;
	key: string;
	fill: string;
	opacity: number;
}

const MAP_WIDTH = 800;
const MAP_HEIGHT = 400;

// The US sits right of center, like the TFR image, at the same size as the airport images (a little smaller than the
// rest) so the whole east coast fits.
const MAP_SCALE = 500;
const MAP_CENTER_X = 531;

const MARKER_RADIUS = 3.2;

// [lng, lat, type]: TypeScript reads a JSON array of mixed values as one array of "string or number"
const waypoints = waypointData as unknown as Array<[lng: number, lat: number, type: string]>;

// The waypoints come in the page's type colors, and several of those (blue, cyan, teal) sit close to the map's cyan,
// so the map's dots are toned down to let them stand out.
const US_DOT_OPACITY = 0.38;

async function loadGoogleFont(font: string, weight: number) {
	const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font)}:wght@${weight}`;
	const css = await (await fetch(url)).text();
	const resource = css.match(
		/src: url\((.+)\) format\('(opentype|truetype)'\)/,
	);

	if (resource) {
		const response = await fetch(resource[1]);
		if (response.status == 200) {
			return await response.arrayBuffer();
		}
	}

	throw new Error("Failed to load font");
}

export default async function WaypointsOgImage() {
	const projection = geoMercator()
		.scale(MAP_SCALE)
		.center([-96, 38])
		.rotate([0, 0, 0])
		.translate([MAP_CENTER_X, MAP_HEIGHT / 2]);

	const pixels: PixelProps[] = [];
	Object.entries(mapCoords).forEach(([countryCode, cities]) => {
		cities.forEach((city, index) => {
			const coords = projection([city.lng, city.lat]);
			if (!coords) return;

			const [x, y] = coords;
			if (x < 0 || x > MAP_WIDTH || y < 0 || y > MAP_HEIGHT) return;

			const key = `${countryCode}-${index}`;
			if (countryCode === "US") return pixels.push({
				key, x, y, fill: "#00BCFF", opacity: US_DOT_OPACITY
			});

			pixels.push({
				key, x, y,
				fill: "#52525C",
				opacity: 0.5
			});
		});
	});

	// a waypoint is a point: it goes where it really is, in the color the waypoints page gives its type
	const markers = waypoints.flatMap(([lng, lat, type]) => {
		const coords = projection([lng, lat]);
		if (!coords) return [];

		const [x, y] = coords;
		if (x < 0 || x > MAP_WIDTH || y < 0 || y > MAP_HEIGHT) return [];
		return [{ key: `${lng},${lat}`, x, y, color: typeInfo(type).color }];
	});

	return new ImageResponse(
		<div
			tw="flex h-full bg-white relative"
			style={{ fontFamily: "Inter", width: "800px", height: "400px" }}
		>
			<div
				tw="flex flex-col justify-center items-center"
				style={{ width: "800px", height: "400px" }}
			>
				<svg width={MAP_WIDTH} height={MAP_HEIGHT} viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}>
					<g>
						{pixels.map(({ x, y, key, fill, opacity }) => (
							<rect
								key={key}
								x={x}
								y={y}
								width={4}
								height={4}
								fillOpacity={opacity}
								fill={fill}
							/>
						))}
					</g>

					<g>
						{markers.map(({ key, x, y, color }) => (
							<circle
								key={key}
								cx={x}
								cy={y}
								r={MARKER_RADIUS}
								fill={color}
								stroke="#FFFFFF"
								strokeWidth={1}
							/>
						))}
					</g>
				</svg>
			</div>

			<div tw="absolute bottom-8 left-8 flex flex-col">
				<span tw="text-[31px]" style={{ fontFamily: "InstrumentSerif" }}>Skywatch</span>
				<div
					tw="flex flex-row items-center text-zinc-600 uppercase text-sm"
					style={{ fontFamily: "JetBrainsMono" }}
				>
					<span>Waypoints</span>
				</div>
			</div>
		</div>,
		{
			width: 800,
			height: 400,
			fonts: [
				{
					name: "JetBrainsMono",
					data: await loadGoogleFont("JetBrains Mono", 400),
					style: "normal",
					weight: 700,
				},
				{
					name: "InstrumentSerif",
					data: await loadGoogleFont("Instrument Serif", 400),
					style: "normal",
					weight: 400,
				},
			],
		},
	);
}
