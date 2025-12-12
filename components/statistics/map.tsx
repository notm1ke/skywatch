"use client";

import mapCoords from "~/geojson/dotted-map.json";

import { cn } from "~/lib/utils";
import { motion } from "motion/react";
import { useMemo, memo } from "react";
import { Diamond } from "lucide-react";
import { AirportWithJoins } from "~/lib/airports";
import { geoMercator, GeoProjection } from "d3-geo";
import { useAirports } from "~/components/airport-provider";

type CoordsData = Record<
	string,
	Array<{
		lng: number;
		lat: number
	}>
>;

type PixelPosition = {
	x: number;
	y: number;
}

type PixelProps = PixelPosition & {
	mode: "primary" | "secondary";
};

type PixelEntry = PixelPosition & {
	key: string;
}

const Pixel = memo(({ x, y, mode }: PixelProps) => (
	<rect
		x={x}
		y={y}
		width={4}
		height={4}
		fillOpacity={
			mode === "primary"
				? 1.0
				: 0.5
		}
		className={cn(
			mode === "primary"
				? "fill-[#93c5fd] dark:fill-[#1e40af]"
				: "fill-zinc-300 dark:fill-zinc-400"
		)}
	/>
));
Pixel.displayName = "Pixel";

type SimpleAirport = Pick<AirportWithJoins, "iata_code" | "latitude_deg" | "longitude_deg">;

type AirportMarkerProps = {
	airports: Array<SimpleAirport>;
	projection: GeoProjection;
};

const AirportMarker = memo(({ airports, projection }: AirportMarkerProps) => {
	const coords = projection([
		airports[0].longitude_deg,
		airports[0].latitude_deg,
	]);
	
	if (!coords) return null;

	const [x, y] = coords;
	const delay = Math.random() * 4

	const iconSize = 4
	return (
		<motion.g
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.5, delay: delay * 0.1 }}
		>
			<foreignObject
				x={x - iconSize / 2}
				y={y - iconSize / 2}
				width={iconSize}
				height={iconSize}
				className="overflow-visible pointer-events-none"
			>
				<Diamond
					size={iconSize}
					className={cn(
						"text-sky-600 fill-sky-600",
						"dark:text-sky-300 dark:fill-sky-300"
					)}
					strokeWidth={1.5}
				/>
			</foreignObject>
		</motion.g>
	)
});
AirportMarker.displayName = "AirportMarker";

export const MapVisualization: React.FC<{ width: number, height: number }> = ({ width, height }) => {
	const { airports, loading } = useAirports();

	const projection = useMemo(
		() => geoMercator()
				.scale(550)
				.center([-96, 38])
				.rotate([0, 0, 0])
				.translate([width / 2, height / 2]),
		[width, height]
	);

	const { usPixels, nonUsPixels } = useMemo(() => {
		const nonUsPixels: Array<PixelEntry> = [];
		const usPixels: Array<PixelEntry> = [];

		Object.entries(mapCoords as CoordsData).forEach(([countryCode, cities]) => {
			cities.forEach((city, index) => {
				const coords = projection([city.lng, city.lat]);
				if (!coords) return;

				const [x, y] = coords;
				if (x < 0 || x > width || y < 0 || y > height) return;

				const key = `${countryCode}-${index}`;
				if (countryCode === "US") return usPixels.push({
					key, x, y
				});
				
				nonUsPixels.push({ key, x, y });
			});
		});

		return { usPixels, nonUsPixels };
	}, [projection, width, height]);

	const groupedAirports = useMemo(() => {
		const precision = 1;
		const groups = new Map<
			string,
			Array<{
				iata_code: string;
				latitude_deg: number;
				longitude_deg: number;
			}>
		>();

		airports.forEach((airport) => {
			const roundedLat = Math.round(airport.latitude_deg * precision) / precision;
			const roundedLng = Math.round(airport.longitude_deg * precision) / precision;
			const key = `${roundedLat},${roundedLng}`;

			if (!groups.has(key)) groups.set(key, []);
			
			groups.get(key)!.push({
				iata_code: airport.iata_code!,
				latitude_deg: airport.latitude_deg,
				longitude_deg: airport.longitude_deg
			});
		});

		return Array.from(groups.values());
	}, [airports]);

	return (
		<div className="relative w-full">
			<svg
				viewBox={`0 0 ${width} ${height}`}
				className="w-full h-auto bg-background"
			>
				<g>{usPixels.map((p) => <Pixel key={p.key} x={p.x} y={p.y} mode="primary" />)}</g>
				<g>{nonUsPixels.map((p) => <Pixel key={p.key} x={p.x} y={p.y} mode="secondary" />)}</g>

				<g>
					{!loading && groupedAirports.map((airports, index) => (
						<AirportMarker
							key={`${airports[0].iata_code}-${index}`}
							airports={airports}
							projection={projection}
						/>
					))}
				</g>
			</svg>
		</div>
	);
}
