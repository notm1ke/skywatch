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

export default async function BaseOgImage() {
	const mapWidth = 800;
	const mapHeight = 400;
	
	const projection = geoMercator()
		.scale(550)
		.center([-96, 38])
		.rotate([0, 0, 0])
		.translate([mapWidth / 2, mapHeight / 2]);
	
	const pixels: PixelProps[] = [];

	Object.entries(mapCoords).forEach(([countryCode, cities]) => {
		cities.forEach((city, index) => {
			const coords = projection([city.lng, city.lat]);
			if (!coords) return;

			const [x, y] = coords;
			if (x < 0 || x > mapWidth || y < 0 || y > mapHeight) return;

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
					<span>With</span>
					<svg
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="#FB2C36"
						stroke="#E7000B"
						strokeWidth="1.5"
						strokeLinecap="round"
						strokeLinejoin="round"
						// @ts-expect-error satori lib type conflicts with react dom types
						tw="mx-1"
					>
						<path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5" />
					</svg>
					
					<span>by MM</span>
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
