import mapCoords from "~/geojson/dotted-map.json";

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

type TfrZone = {
	lat: number
	lng: number
	radius: number
	label: string
}

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

export default async function TfrsOgImage() {
	const mapWidth = 800;
	const mapHeight = 400;
	
	const projection = geoMercator()
		.scale(550)
		.center([-96, 38])
		.rotate([0, 0, 0])
		.translate([mapWidth / 2, mapHeight / 2]);
	
	const tfrZones: TfrZone[] = [
		{ lat: 38.8951, lng: -77.0364, radius: 40, label: "DC" }, // Washington DC
		{ lat: 34.0522, lng: -118.2437, radius: 35, label: "LAX" }, // Los Angeles
		{ lat: 29.9511, lng: -90.0715, radius: 30, label: "MSY" }, // New Orleans
		{ lat: 42.3601, lng: -71.0589, radius: 25, label: "BOS" }, // Boston
	]
	
	const isInTFRZone = (x: number, y: number) => {
		for (const zone of tfrZones) {
			const coords = projection([zone.lng, zone.lat])
			if (!coords) continue
			const [centerX, centerY] = coords
			const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2))
			if (distance <= zone.radius) return true
		}
		return false
	}
	
	const pixels: PixelProps[] = []
	Object.entries(mapCoords).forEach(([countryCode, cities]) => {
		cities.forEach((city, index) => {
			const coords = projection([city.lng, city.lat])
			if (!coords) return

			const [x, y] = coords
			if (x < 0 || x > mapWidth || y < 0 || y > mapHeight) return

			const key = `${countryCode}-${index}`

			if (isInTFRZone(x, y)) {
				return pixels.push({
					key,
					x,
					y,
					fill: "#DC2626",
					opacity: 0.9,
				})
			}

			if (countryCode === "US")
				return pixels.push({
					key,
					x,
					y,
					fill: "#00BCFF",
					opacity: 1.0,
				})

			pixels.push({
				key,
				x,
				y,
				fill: "#52525C",
				opacity: 0.5,
			})
		})
	})
	
	return new ImageResponse(
		<div
			tw="flex h-full bg-white relative"
			style={{ fontFamily: "Inter", width: "800px", height: "400px" }}
		>
			<div
				tw="flex flex-col justify-center items-center"
				style={{ width: "800px", height: "400px", transform: "translateX(20%)" }}
			>
				<svg viewBox={`0 0 ${mapWidth} ${mapHeight}`}>
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
				</svg>
			</div>
			<div tw="absolute bottom-8 left-8 flex flex-col">
				<span tw="text-[31px]" style={{ fontFamily: "InstrumentSerif" }}>Skywatch</span>
				<div
					tw="flex flex-row items-center text-zinc-600 uppercase text-sm"
					style={{ fontFamily: "JetBrainsMono" }}
				>
					<span>Temporary Flight Restrictions</span>
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
