import mapCoords from "~/geojson/dotted-map.json";
import airports from "~/geojson/og-airports.json";

import { geoMercator } from "d3-geo";
import { ImageResponse } from "next/og";

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

// The US sits right of center, like the TFR image, and at the same size as the airport pages' images (a little
// smaller than the rest) so the whole east coast fits.
const MAP_SCALE = 500;
const MAP_CENTER_X = 531;

// the statistics map's markers: a diamond per airport, in the same amber as the ring on each airport's own image
const MARKER = "#F59E0B";
const MARKER_RADIUS = 4.5;

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

export default async function AirportsOgImage() {
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
				key, x, y, fill: "#00BCFF", opacity: 1.0
			});

			pixels.push({
				key, x, y,
				fill: "#52525C",
				opacity: 0.5
			});
		});
	});

	// the dots are drawn from their top-left corner, but an airport is a point: it goes where it really is
	const markers = airports.flatMap(([lng, lat]) => {
		// Only the lower 48. With the map shifted right, Hawaii's longitude lands just inside the left edge (and
		// Alaska's panhandle inside the top-left corner), where they'd look like strays.
		if (lng < -126 || lng > -66 || lat < 24 || lat > 50) return [];

		const coords = projection([lng, lat]);
		if (!coords) return [];

		const [x, y] = coords;
		if (x < 0 || x > MAP_WIDTH || y < 0 || y > MAP_HEIGHT) return [];
		return [{ key: `${lng},${lat}`, x, y }];
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
						{markers.map(({ key, x, y }) => (
							<path
								key={key}
								d={`M${x},${y - MARKER_RADIUS} L${x + MARKER_RADIUS},${y} L${x},${y + MARKER_RADIUS} L${x - MARKER_RADIUS},${y} Z`}
								fill={MARKER}
								stroke="#FFFFFF"
								strokeWidth={1}
								strokeLinejoin="round"
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
					<span>Airports</span>
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
