import Map from "react-map-gl/mapbox";

import { useTheme } from "next-themes";
import { useIsMobile } from "~/hooks/use-mobile";
import { AirportWithJoins } from "~/lib/airports";
import { Fragment, PropsWithChildren } from "react";
import { Globe, Mountain, RadioTower } from "lucide-react";
import { WikipediaIcon } from "~/components/icons/wikipedia";
import { GoogleMapsIcon } from "~/components/icons/google-maps";
import { cn, getUrlDomain, shortenAirportName } from "~/lib/utils";

import {
	AttributionControl,
	Marker,
	NavigationControl,
} from "react-map-gl/mapbox";

const AirportSiteFavicon: React.FC<{ url: string }> = ({ url }) => (
	<img
		src={`https://www.google.com/s2/favicons?domain=${url}&sz=128`}
		className="size-3.5 rounded-[30%]"
	/>
)

const getStateFromRegion = (isoRegion: string | null, fallback: string) => {
	if (!isoRegion || !isoRegion.includes('-')) return fallback;
	const [_, state] = isoRegion.split('-');
	return state;
}

const QuickLink: React.FC<PropsWithChildren<{ href: string }>> = ({ href, children }) => (
	<a
		href={href}
		target="_blank"
		rel="noopener noreferrer"
		className="flex items-center gap-1.5 rounded-md border bg-white/65 dark:bg-[#0a0a0a]/65 px-3 py-1.5 text-zinc-800 dark:text-zinc-400 backdrop-blur-sm transition-colors hover:text-zinc-600 dark:hover:text-white"
	>
		{children}
	</a>
)

export const AirportMap: React.FC<{ airport: AirportWithJoins }> = ({ airport }) => {
	const mobile = useIsMobile();
	const { resolvedTheme: theme } = useTheme();
	
	return (
		<div className="relative h-[40vh] overflow-hidden">
			<Map
				mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
				initialViewState={{
					longitude: airport.longitude_deg,
					latitude: airport.latitude_deg,
					zoom: 12.5,
				}}
				minZoom={11.5}
				maxZoom={25}
				style={{ width: "100%", height: "40vh" }}
				mapStyle={
					theme === 'dark'
						? 'mapbox://styles/mapbox/dark-v11'
						: 'mapbox://styles/mapbox/light-v11'
				}
				attributionControl={false}
			>
				<AttributionControl
					compact
					customAttribution="Skywatch (c) 2025"
					style={{
						color: "black",
						fontSize: "12px",
						fontFamily: "monospace",
					}}
				/>
				
				{!mobile && <NavigationControl position="top-right" />}
				
				{airport.runways.map((runway) => (
					<Fragment key={runway.id}>
						<Marker
							longitude={runway.le_longitude_deg!}
							latitude={runway.le_latitude_deg!}
							anchor="center"
						>
							<div className="flex flex-col items-center">
								<div className="text-xs font-mono bg-yellow-500 text-white px-1 rounded mb-1">
									{runway.le_ident}
								</div>
							</div>
						</Marker>
						<Marker
							longitude={runway.he_longitude_deg!}
							latitude={runway.he_latitude_deg!}
							anchor="center"
						>
							<div className="flex flex-col items-center">
								<div className="text-xs font-mono bg-yellow-500 text-white px-1 rounded mb-1">
									{runway.he_ident}
								</div>
							</div>
						</Marker>
					</Fragment>
				))}
			</Map>
			
			<div className="absolute left-2 top-1.5 min-w-[calc(100%-1.15rem)] sm:min-w-auto sm:max-w-sm rounded-lg border border-border/50 bg-white/65 dark:bg-[#0a0a0a]/65 p-5 backdrop-blur-sm">
				<div className="mb-2 flex items-center gap-2">
					<span className="rounded bg-zinc-300 dark:bg-zinc-800 px-2 py-0.5 font-mono text-xs text-zinc-800 dark:text-zinc-400">
						<span className="text-zinc-500 dark:text-zinc-300 text-xs align-text-top">IATA</span>{" "}
						{airport.iata_code}
					</span>
					<span className="rounded bg-zinc-300 dark:bg-zinc-800 px-2 py-0.5 font-mono text-xs text-zinc-800 dark:text-zinc-400">
						<span className="text-zinc-500 dark:text-zinc-300 text-xs align-text-top">ICAO</span>{" "}
						{airport.icao_code}
					</span>
					<span className="rounded bg-zinc-300 dark:bg-zinc-800 px-2 py-0.5 font-mono text-xs text-zinc-800 dark:text-zinc-400">
						{airport.municipality}, {getStateFromRegion(airport.iso_region, airport.iso_country!)}
					</span>
				</div>
				<h1 className="sm:mb-1 text-xl font-semibold text-zinc-800 dark:text-white">
					{shortenAirportName(airport.name)}
				</h1>
				<div className="items-center gap-2 text-xs hidden sm:flex">
					<div className="flex items-center gap-3 mt-2 text-xs text-zinc-800 dark:text-white/80">
						<div className="flex items-center gap-1">
							<Mountain className="h-3 w-3" />
							<span>{airport.elevation_ft!.toLocaleString()} ft</span>
						</div>
						<div className="flex items-center gap-1">
							<Globe className="h-3 w-3" />
							<span className="font-mono">
								{airport.latitude_deg.toFixed(4)}°,{" "}
								{airport.longitude_deg.toFixed(4)}°
							</span>
						</div>
					</div>
				</div>
				
			</div>
			<div className={cn("absolute left-2 flex gap-1", mobile ? "bottom-0.5" : "bottom-2")}>
				{airport.home_link && (
					<QuickLink href={airport.home_link}>
						<AirportSiteFavicon url={airport.home_link} />
						{mobile && "Website"}
						{!mobile && getUrlDomain(airport.home_link, "Website")}
					</QuickLink>
				)}
				
				{airport.wikipedia_link && (
					<QuickLink href={airport.wikipedia_link}>
						<WikipediaIcon className="size-4 fill-black dark:fill-white" />
						Wikipedia
					</QuickLink>
				)}
				
				<QuickLink href={`https://www.liveatc.net/search/?icao=${airport.icao_code}`}>
					<RadioTower className="size-3.5 text-black dark:text-white" />
					LiveATC
				</QuickLink>
				
				{!mobile && (
					<QuickLink href={`https://maps.google.com/?q=${airport.name}`}>
						<GoogleMapsIcon className="size-3.5" />
						Google Maps
					</QuickLink>
				)}
			</div>
		</div>
	);
};