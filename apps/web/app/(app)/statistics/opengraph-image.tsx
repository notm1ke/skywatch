import mapCoords from "~/geojson/dotted-map.json";
import stats from "~/geojson/og-statistics.json";

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

// Same placement as the airport pages' images: the US right of center, so the left column is free for the signature
// and the whole east coast still fits.
const MAP_SCALE = 500;
const MAP_CENTER_X = 531;

// The page's own map sizes each airport by how many flights land there; so does this. Dark enough to read on the dots.
const MARKER = "#0369A1";
const MARKER_MIN = 3;
const MARKER_MAX = 11;

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

export default async function StatisticsOgImage() {
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
			// dimmed so the markers carry the picture
			if (countryCode === "US") return pixels.push({
				key, x, y, fill: "#00BCFF", opacity: 0.4
			});

			pixels.push({
				key, x, y,
				fill: "#52525C",
				opacity: 0.35
			});
		});
	});

	// JSON arrays come in typed as `(string | number)[]`, so say what the rows are, biggest first: that way a small airport
	// beside a big one (LaGuardia by Kennedy) is drawn on top of it and still shows
	const airports = stats.airports as Array<[iata: string, lng: number, lat: number, flights: number]>;
	const busiest = Math.max(...airports.map(([, , , flights]) => flights));

	const markers = airports.flatMap(([iata, lng, lat, flights]) => {
		const coords = projection([lng, lat]);
		if (!coords) return [];

		const [x, y] = coords;
		if (x < 0 || x > MAP_WIDTH || y < 0 || y > MAP_HEIGHT) return [];

		const r = MARKER_MIN + (MARKER_MAX - MARKER_MIN) * Math.sqrt(flights / busiest);
		return [{ key: iata, x, y, r }];
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
						{markers.map(({ key, x, y, r }) => (
							<path
								key={key}
								d={`M${x},${y - r} L${x + r},${y} L${x},${y + r} L${x - r},${y} Z`}
								fill={MARKER}
								fillOpacity={0.62}
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
					<span>Statistics</span>
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
