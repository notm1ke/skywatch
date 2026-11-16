"use client";

import mapCoords from "~/geojson/dotted-map.json";

import { cn } from "cnfast";
import { motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { Diamond } from "lucide-react";
import { geoMercator, GeoProjection } from "d3-geo";
import { useAirports } from "~/components/airport-provider";
import { useBoxSize } from "./shared";
import { AirportStatusCard } from "~/components/airspace/airspace-map-hover";
import { HoverCard, HoverCardTrigger } from "~/components/ui/hover-card";
import { STATUS, useLiveStatus, useVolume, type LiveAirport, type LiveStatus } from "./live-status";
import { AirportWithJoins } from "@skywatch/gateway/schemas";
import { useMemo, useState, memo, type ReactNode } from "react";

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
	size: number;
};

type PixelEntry = PixelPosition & {
	key: string;
}

const Pixel = memo(({ x, y, mode, size }: PixelProps) => (
	<rect
		x={x}
		y={y}
		width={size}
		height={size}
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
	size: number;
};

const AirportMarker = memo(({ airports, projection, size }: AirportMarkerProps) => {
	const coords = projection([
		airports[0].longitude_deg,
		airports[0].latitude_deg,
	]);

	if (!coords) return null;

	const [x, y] = coords;
	const delay = Math.random() * 4

	return (
		<motion.g
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.5, delay: delay * 0.1 }}
		>
			<foreignObject
				x={x - size / 2}
				y={y - size / 2}
				width={size}
				height={size}
				className="overflow-visible pointer-events-none"
			>
				<Diamond
					size={size}
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

// --- Fitting the map to its box ------------------------------------------------------------------------------
// The lower 48 is about this big in a Mercator projection, in radians: 125°W to 66.5°W, 24.5°N to 49.5°N. The scale
// that fits it in a box is whichever of "this wide" and "this tall" runs out of room first.
const US_CENTER: [number, number] = [-95.75, 38.3];
const US_WIDTH = 1.021;
const US_HEIGHT = 0.5553;

// The dotted map is a grid with this many degrees of longitude between dots.
const GRID_STEP = 1.2157 * (Math.PI / 180);

/** What a map's children are drawn with: where a longitude and latitude land, and how big a dot is. */
export type MapLayout = {
	projection: GeoProjection;
	/** the size of one of the map's dots, in pixels */
	dot: number;
	width: number;
	height: number;
};

type DottedMapProps = {
	/** room kept clear around the country, in pixels */
	padding?: number;
	className?: string;
	/** the map takes the pointer (for things drawn on it that react to it); by default it's just a picture */
	interactive?: boolean;
	/** drawn over the dots, in the map's own pixels */
	children?: (layout: MapLayout) => ReactNode;
};

/**
 * The dotted map of the US. It fills whatever box it's put in (that box needs a size of its own) and draws at that size,
 * rather than being a picture scaled up and down: the country is fitted to the box, and the dots keep their
 * proportions to the gaps between them at any size. Anything to mark on it goes in as children.
 */
export const DottedMap: React.FC<DottedMapProps> = ({ padding = 16, className, interactive = false, children }) => {
	const [ref, size] = useBoxSize();

	const layout = useMemo(() => {
		if (!size || size.width === 0 || size.height === 0) return null;

		const scale = Math.max(
			1,
			Math.min(
				(size.width - padding * 2) / US_WIDTH,
				(size.height - padding * 2) / US_HEIGHT
			)
		);

		const projection = geoMercator()
			.scale(scale)
			.center(US_CENTER)
			.rotate([0, 0, 0])
			.translate([size.width / 2, size.height / 2]);

		// a dot is about a third of the way to its neighbor
		const dot = Math.max(2, Math.round(scale * GRID_STEP * 0.34));

		return { projection, dot, ...size };
	}, [size, padding]);

	const { usPixels, nonUsPixels } = useMemo(() => {
		const nonUsPixels: Array<PixelEntry> = [];
		const usPixels: Array<PixelEntry> = [];
		if (!layout) return { usPixels, nonUsPixels };

		Object.entries(mapCoords as CoordsData).forEach(([countryCode, cities]) => {
			cities.forEach((city, index) => {
				const coords = layout.projection([city.lng, city.lat]);
				if (!coords) return;

				const [x, y] = coords;
				if (x < -layout.dot || x > layout.width || y < -layout.dot || y > layout.height) return;

				const key = `${countryCode}-${index}`;
				if (countryCode === "US") return usPixels.push({
					key, x, y
				});

				nonUsPixels.push({ key, x, y });
			});
		});

		return { usPixels, nonUsPixels };
	}, [layout]);

	return (
		<div ref={ref} className={cn("absolute inset-0 overflow-hidden", !interactive && "pointer-events-none", className)}>
			{layout && (
				<svg width={layout.width} height={layout.height} className="block">
					<g>{usPixels.map((p) => <Pixel key={p.key} x={p.x} y={p.y} size={layout.dot} mode="primary" />)}</g>
					<g>{nonUsPixels.map((p) => <Pixel key={p.key} x={p.x} y={p.y} size={layout.dot} mode="secondary" />)}</g>
					{children?.(layout)}
				</svg>
			)}
		</div>
	);
};

type Props = {
	padding?: number;
	className?: string;
};

/**
 * A ring around an airport with something wrong right now. Closures and ground stops pulse: nothing is moving there.
 * The ring is a size of its own rather than the marker's, so a small airport's trouble is as easy to see as a big one's.
 */
const StatusRing: React.FC<{
	x: number;
	y: number;
	r: number;
	live: LiveAirport;
	airport: AirportWithJoins;
}> = ({ x, y, r, live, airport }) => {
	const router = useRouter();
	const reduceMotion = useReducedMotion();
	const [lit, setLit] = useState(false);
	const { color, pulse, hollow } = STATUS[live.status];
	const open = () => router.push(`/airports/${airport.iata_code}`);

	// The hover card is the airspace page's own (`AirportStatusCard`), so an airport reads the same on both maps. The ring
	// is a link that happens to be drawn in an SVG: reachable by keyboard, announced as what it is.
	return (
		<HoverCard openDelay={40} closeDelay={0}>
			<HoverCardTrigger asChild>
				<g
					role="link"
					tabIndex={0}
					aria-label={`${airport.iata_code}, ${airport.name}: ${STATUS[live.status].label}. Open the airport.`}
					onPointerEnter={() => setLit(true)}
					onPointerLeave={() => setLit(false)}
					onFocus={() => setLit(true)}
					onBlur={() => setLit(false)}
					onClick={open}
					onKeyDown={event => { if (event.key === "Enter") open(); }}
					className="cursor-pointer outline-none"
				>
					{pulse && !reduceMotion && (
						<motion.circle
							cx={x}
							cy={y}
							fill="none"
							stroke={color}
							strokeWidth={1.5}
							initial={{ r, opacity: 0.7 }}
							animate={{ r: r + 9, opacity: 0 }}
							transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
							className="pointer-events-none"
						/>
					)}
					{/* dashed and hollow for a limited closure: red, but it doesn't shut the airport */}
					<circle
						cx={x}
						cy={y}
						r={lit ? r + 1.5 : r}
						fill={color}
						fillOpacity={hollow ? (lit ? 0.12 : 0.04) : lit ? 0.35 : 0.2}
						stroke={color}
						strokeWidth={2}
						strokeDasharray={hollow ? "4 3" : undefined}
					/>
					{/* a bigger target than the ring: they're small, and some sit close to other airports */}
					<circle cx={x} cy={y} r={r + 6} fill="transparent" />
				</g>
			</HoverCardTrigger>
			<AirportStatusCard advisory={live.advisory} airport={airport} />
		</HoverCard>
	);
};

/** The dotted map with a marker at each airport we track, bigger for the busier ones, and a ring on the ones in trouble. */
export const MapVisualization: React.FC<Props> = ({ padding = 16, className }) => {
	const { airports, loading } = useAirports();
	const live = useLiveStatus();
	const volume = useVolume();

	const byIata = useMemo(() => new Map(airports.map(airport => [airport.iata_code, airport])), [airports]);

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
		<>
			{/* it takes the pointer so the rings can be hovered; the dots and diamonds under it don't care */}
			<DottedMap padding={padding} className={className} interactive>
				{layout => {
					const base = Math.max(4, Math.round(layout.dot * 1.1));

					return (
						<>
							<g>
								{!loading && groupedAirports.map((group, index) => {
									// the busiest airport in a group sets its size: from the usual size up to about two and a half times it
									const busiest = Math.max(0, ...group.map(airport => volume.flights.get(airport.iata_code) ?? 0));
									const size = Math.round(base * (1 + 1.4 * Math.sqrt(busiest / volume.max)));

									return (
										<AirportMarker
											key={`${group[0].iata_code}-${index}`}
											airports={group}
											projection={layout.projection}
											size={size}
										/>
									);
								})}
							</g>

							<g>
								{[...live.airports.values()].map(status => {
									const place = byIata.get(status.iata);
									const point = place && layout.projection([place.longitude_deg, place.latitude_deg]);
									if (!place || !point) return null;

									const size = Math.round(base * (1 + 1.4 * Math.sqrt((volume.flights.get(status.iata) ?? 0) / volume.max)));

									return (
										<StatusRing
											key={status.iata}
											x={point[0]}
											y={point[1]}
											r={size / 2 + 4}
											live={status}
											airport={place}
										/>
									);
								})}
							</g>
						</>
					);
				}}
			</DottedMap>
		</>
	);
}
