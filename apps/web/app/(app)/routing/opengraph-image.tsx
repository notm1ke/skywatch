import mapCoords from "~/geojson/dotted-map.json";
import routes from "~/geojson/og-routes.json";

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
	/** side length, drawn around the dot's center; the map's own dots are 4 */
	size?: number;
}

const DOT = 4;

// Route and airport dots are drawn bigger than the rest: on a grid this coarse, same-size colored dots just
// scatter among the cyan ones instead of reading as a path.
const ROUTE_DOT = 7;
const AIRPORT_DOT = 9;

// How far along a route to step before snapping to the nearest dot. The dots sit about 11.5px apart, so this is
// small enough that no dot along the way gets skipped.
const STEP = 1.5;

const ROUTE_COLOR = "#FACC15";
const AIRPORT_COLOR = "#DC2626";

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

type Point = [number, number];

/** points every `step` px along a polyline, including both ends */
const walk = (line: Point[], step: number): Point[] => {
	const points: Point[] = line.length ? [line[0]] : [];

	for (let i = 1; i < line.length; i++) {
		const [ax, ay] = line[i - 1];
		const [bx, by] = line[i];
		const count = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / step));

		for (let n = 1; n <= count; n++) {
			points.push([ax + ((bx - ax) * n) / count, ay + ((by - ay) * n) / count]);
		}
	}

	return points;
};

export default async function RoutingOgImage() {
	const mapWidth = 800;
	const mapHeight = 400;

	const projection = geoMercator()
		.scale(550)
		.center([-96, 38])
		.rotate([0, 0, 0])
		.translate([mapWidth / 2, mapHeight / 2]);

	// each route as a polyline in image space, through its fixes
	const lines = routes.map(route => route.points.flatMap(([lng, lat]) => {
		const coords = projection([lng, lat]);
		return coords ? [coords as Point] : [];
	}));

	// every airport once, even where several corridors share it (SFO, LAX, SEA)
	const airports = new Map<string, Point>();
	routes.forEach((route, i) => {
		const line = lines[i];
		if (!airports.has(route.from)) airports.set(route.from, line[0]);
		if (!airports.has(route.to)) airports.set(route.to, line[line.length - 1]);
	});

	type Dot = { key: string; x: number; y: number; country: string };
	const dots: Dot[] = [];
	Object.entries(mapCoords).forEach(([countryCode, cities]) => {
		cities.forEach((city, index) => {
			const coords = projection([city.lng, city.lat]);
			if (!coords) return;

			const [x, y] = coords;
			if (x < 0 || x > mapWidth || y < 0 || y > mapHeight) return;
			dots.push({ key: `${countryCode}-${index}`, x, y, country: countryCode });
		});
	});

	// The dots are drawn from their top-left corner, so a point is compared with their centers.
	const nearestDot = ([px, py]: Point) => {
		let nearest = dots[0];
		let best = Infinity;
		for (const dot of dots) {
			const distance = Math.hypot(dot.x + 2 - px, dot.y + 2 - py);
			if (distance < best) {
				best = distance;
				nearest = dot;
			}
		}

		return nearest.key;
	};

	// Snapping every step along a route to its nearest dot gives a connected trail one dot wide. Coloring every dot
	// within reach instead made fat bands that merged wherever routes ran close together.
	const routeDots = new Set(lines.flatMap(line => walk(line, STEP).map(nearestDot)));

	// An airport is the dot closest to it, wherever that is: it would be easy to lose one to a gap in the grid.
	const airportDots = new Set([...airports.values()].map(nearestDot));

	const pixels: PixelProps[] = dots.map(({ key, x, y, country }) => {
		if (airportDots.has(key)) return { key, x, y, fill: AIRPORT_COLOR, opacity: 1.0, size: AIRPORT_DOT };
		if (routeDots.has(key)) return { key, x, y, fill: ROUTE_COLOR, opacity: 1.0, size: ROUTE_DOT };
		if (country === "US") return { key, x, y, fill: "#00BCFF", opacity: 1.0 };
		return { key, x, y, fill: "#52525C", opacity: 0.5 };
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
				<svg viewBox={`0 0 ${mapWidth} ${mapHeight}`}>
					<g>
						{pixels.map(({ x, y, key, fill, opacity, size = DOT }) => (
							<rect
								key={key}
								x={x + (DOT - size) / 2}
								y={y + (DOT - size) / 2}
								width={size}
								height={size}
								fillOpacity={opacity}
								fill={fill}
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
					<span>Airway Routing</span>
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
