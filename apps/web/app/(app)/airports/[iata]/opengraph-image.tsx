import mapCoords from "~/geojson/dotted-map.json";

import { geoMercator } from "d3-geo";
import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";
import { AirportWithJoins } from "@skywatch/gateway/schemas";
import { formatAirportLocation, shortenAirportName } from "~/lib/utils";

export const size = {
	width: 800,
	height: 400,
};

export const contentType = "image/png";

type Params = {
	iata: string;
};

type Point = [number, number];

type PixelProps = {
	x: number;
	y: number;
	key: string;
	fill: string;
	opacity: number;
}

const MAP_WIDTH = 800;
const MAP_HEIGHT = 400;

const AMBER = "#F59E0B";

// Text on the left, map on the right. Dots never draw inside the column, so the two can't overlap; the map is
// centered in what's left of the frame, which puts the US where the TFR image has it (shifted right).
const COLUMN_WIDTH = 262;
const COLUMN_INSET = 32;
const MAP_CENTER_X = (COLUMN_WIDTH + MAP_WIDTH) / 2;

// a little smaller than the other images (550) so the whole east coast fits beside the column
const MAP_SCALE = 500;

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

/**
 * Asks the gateway for the airport directly instead of through the oRPC client. Inside this route (Next 16.4) the
 * client's requests come back as a synthetic 500 "fetch failed": it hands `fetch` a Request object, which the route's
 * fetch can't send, while `fetch(url, init)` is fine. oRPC wraps its payload in `{ json }`.
 */
const loadAirport = async (iata: string): Promise<AirportWithJoins | null> => {
	const response = await fetch(`${process.env.NEXT_PUBLIC_GATEWAY_URL}/airports/findByIata`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ json: { iata_code: iata } }),
	}).catch(() => null);

	if (!response?.ok) return null;
	const body = await response.json().catch(() => null);
	return (body?.json ?? null) as AirportWithJoins | null;
};

// We cap it at 26 characters, and mark a cut with an ellipsis so it reads as shortened rather than just wrong.
const getBoundedAirportName = (raw: string) => {
	// shortening the name removes words from the middle of it ("North Platte Regional  Lee Bird Field")
	const name = raw.replace(/\s+/g, ' ').trim();

	const maxLength = 26;
	if (name.length <= maxLength) return name;
	const sliced = name.slice(0, maxLength);

	// check if we're cutting in the middle of a word
	let cut = sliced;
	if (name[maxLength] !== ' ' && sliced[maxLength - 1] !== ' ') {
		const lastSpaceIndex = sliced.lastIndexOf(' ');
		if (lastSpaceIndex !== -1) cut = sliced.slice(0, lastSpaceIndex);
	}

	// don't end on the debris of a longer name: an unclosed "(Webb", or a dangling " -"
	const tidy = cut
		.replace(/\s*\([^)]*$/, '')
		.replace(/[\s\-–—,:;/&(]+$/, '');

	return `${tidy || cut.trim()}…`;
}

const projectionAround = (center: Point) => geoMercator()
	.scale(MAP_SCALE)
	.center(center)
	.rotate([0, 0, 0])
	.translate([MAP_CENTER_X, MAP_HEIGHT / 2]);

/**
 * The US, unless the airport isn't in it (Alaska, Hawaii): then the map is centered on the airport instead, in the
 * same space beside the column.
 */
const projectionFor = (lng: number, lat: number) => {
	const standard = projectionAround([-96, 38]);
	const at = standard([lng, lat]);

	const inView = at
		&& at[0] > COLUMN_WIDTH + 24
		&& at[0] < MAP_WIDTH - 24
		&& at[1] > 24
		&& at[1] < MAP_HEIGHT - 24;

	return inView ? standard : projectionAround([lng, lat]);
};

// the same code chips as the card on the airport page's map
const Chip: React.FC<{ label: string; value: string }> = ({ label, value }) => (
	<div
		tw="flex items-center rounded bg-zinc-200 px-2 py-0.5 mr-1.5 text-zinc-800"
		style={{ fontFamily: "JetBrainsMono", fontSize: 11 }}
	>
		<span tw="text-zinc-500 mr-1" style={{ fontSize: 9 }}>{label}</span>
		{value}
	</div>
);

export default async function AirportInspectorOgImage({ params }: { params: Promise<Params> }) {
	const slug = await params;
	const airport = await loadAirport(slug.iata.toUpperCase());

	if (!airport) return NextResponse.json(
		{ message: "Airport not found" },
		{ status: 404 }
	);

	const name = getBoundedAirportName(shortenAirportName(airport.name));
	const projection = projectionFor(airport.longitude_deg, airport.latitude_deg);
	const at = (projection([airport.longitude_deg, airport.latitude_deg]) ?? [MAP_WIDTH / 2, MAP_HEIGHT / 2]) as Point;

	const pixels: PixelProps[] = [];
	Object.entries(mapCoords).forEach(([countryCode, cities]) => {
		cities.forEach((city, index) => {
			const coords = projection([city.lng, city.lat]);
			if (!coords) return;

			const [x, y] = coords;

			// nothing under the text column
			if (x < COLUMN_WIDTH || x > MAP_WIDTH || y < 0 || y > MAP_HEIGHT) return;

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

	const elevation = airport.elevation_ft === null || airport.elevation_ft === undefined
		? null
		: `${airport.elevation_ft.toLocaleString()} ft`;

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

					{/* the airport: a ring with a dot in it, over a faint wider ring */}
					<circle cx={at[0]} cy={at[1]} r={26} fill="none" stroke={AMBER} strokeOpacity={0.3} strokeWidth={1.5} />
					<circle cx={at[0]} cy={at[1]} r={14} fill={AMBER} fillOpacity={0.18} stroke={AMBER} strokeWidth={2.5} />
					<circle cx={at[0]} cy={at[1]} r={4.5} fill={AMBER} stroke="#FFFFFF" strokeWidth={1.5} />
				</svg>
			</div>

			{/* the airport, top left: straight on the page, no box */}
			<div
				tw="absolute flex flex-col"
				style={{ left: COLUMN_INSET, top: COLUMN_INSET, width: COLUMN_WIDTH - COLUMN_INSET - 16 }}
			>
				<div tw="flex flex-wrap">
					<Chip label="IATA" value={airport.iata_code} />
					<Chip label="ICAO" value={airport.icao_code} />
				</div>

				<div
					tw="flex font-bold text-zinc-900 mt-3"
					style={{ fontSize: 24, lineHeight: 1.15, letterSpacing: "-0.02em" }}
				>
					{name}
				</div>

				<div tw="flex text-zinc-500 mt-1.5" style={{ fontSize: 14 }}>
					{formatAirportLocation(airport)}
				</div>

				{elevation && (
					<div tw="flex items-center text-zinc-600 mt-3" style={{ fontSize: 12 }}>
						<svg
							width="12"
							height="12"
							viewBox="0 0 24 24"
							fill="none"
							stroke="#71717A"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
							// @ts-expect-error satori lib type conflicts with react dom types
							tw="mr-1"
						>
							<path d="m8 3 4 8 5-5 5 15H2L8 3z" />
						</svg>
						<span>{elevation}</span>
					</div>
				)}
			</div>

			{/* the same signature as the other images: bottom left, in the same place */}
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
					name: "Inter",
					data: await loadGoogleFont("Inter", 400),
					style: "normal",
					weight: 400,
				},
				{
					name: "Inter",
					data: await loadGoogleFont("Inter", 700),
					style: "normal",
					weight: 700,
				},
				{
					name: "JetBrainsMono",
					data: await loadGoogleFont("JetBrains Mono", 400),
					style: "normal",
					weight: 400,
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
