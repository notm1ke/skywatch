import Map from "react-map-gl/mapbox";

import { useTheme } from "next-themes";
import { Marker } from "react-map-gl/mapbox";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { useMobile } from "~/components/mobile-provider";
import { WikipediaIcon } from "~/components/icons/wikipedia";
import { AirportWithJoins } from "@skywatch/gateway/schemas";
import { GoogleMapsIcon } from "~/components/icons/google-maps";
import { Globe, LinkIcon, Mountain, RadioTower } from "lucide-react";
import { MapControls, MapLayers } from "~/components/ui/map-controls";
import { Fragment, PropsWithChildren, useRef, useState } from "react";

import {
	formatAirportLocation,
	getUrlDomain,
	shortenAirportName
} from "~/lib/utils";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from "~/components/ui/dropdown-menu";

const AirportSiteFavicon: React.FC<{ url: string }> = ({ url }) => (
	<img
		src={`https://www.google.com/s2/favicons?domain=${url}&sz=128`}
		className="size-3.5 rounded-[30%]"
	/>
)

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

const MobileQuickLinksControl: React.FC<{ airport: AirportWithJoins }> = ({ airport }) => (
	<DropdownMenu>
		<DropdownMenuTrigger asChild>
			<Button variant="outline" size="icon" className="flex sm:hidden">
				<LinkIcon />
			</Button>
		</DropdownMenuTrigger>
		<DropdownMenuContent side="left" align="start">
			{airport.home_link && (
				<DropdownMenuItem>
					<AirportSiteFavicon url={airport.home_link} />
					{getUrlDomain(airport.home_link)}
				</DropdownMenuItem>
			)}
			
			{airport.wikipedia_link && (
				<DropdownMenuItem>
					<WikipediaIcon className="fill-black dark:fill-white" />
					Wikipedia
				</DropdownMenuItem>
			)}
			
			<DropdownMenuItem>
				<RadioTower />
				LiveATC
			</DropdownMenuItem>
			
			<DropdownMenuItem>
				<GoogleMapsIcon />
				Google Maps
			</DropdownMenuItem>
		</DropdownMenuContent>
	</DropdownMenu>
)

export const AirportMapSkeletonLoader = () => (
	<div className="relative h-[40vh] overflow-hidden bg-zinc-100 dark:bg-zinc-900">
		<Skeleton className="h-full w-full" />

		<div className="hidden sm:absolute left-2 top-1.5 min-w-[calc(100%-1.15rem)] sm:min-w-auto sm:max-w-sm rounded-lg border border-border/50 bg-white/65 dark:bg-[#0a0a0a]/65 p-5 backdrop-blur-sm">
			<div className="mb-2 flex items-center gap-2">
				<Skeleton className="h-5 w-16 rounded" />
				<Skeleton className="h-5 w-16 rounded" />
				<Skeleton className="h-5 w-24 rounded" />
			</div>
			<Skeleton className="h-7 w-48 sm:mb-1" />
			<div className="items-center gap-2 text-xs hidden sm:flex">
				<div className="flex items-center gap-3 mt-2">
					<Skeleton className="h-4 w-16" />
					<Skeleton className="h-4 w-32" />
				</div>
			</div>
		</div>

		<div className="absolute left-2 bottom-2 flex gap-1">
			<Skeleton className="h-8 w-24 rounded-md" />
			<Skeleton className="h-8 w-24 rounded-md" />
			<Skeleton className="h-8 w-20 rounded-md" />
		</div>
	</div>
)

export const AirportMap: React.FC<{ airport: AirportWithJoins }> = ({ airport }) => {
	const mapContainerRef = useRef<HTMLDivElement>(null);
	const layers: MapLayers = [
		{
			key: "runways",
			name: "Runways",
			color: "var(--color-yellow-500)",
			count: airport.runways.length
		},
		{
			key: "navaids",
			name: "Navaids",
			color: "var(--color-blue-500)",
			count: airport.navaids.length
		},
	];
	
	const { mobile, pending } = useMobile();
	const { resolvedTheme: theme } = useTheme();
	const [enabledLayers, setEnabledLayers] = useState<Set<string>>(
		() => new Set<string>(
			layers
				.filter(layer => !layer.defaultState || layer.defaultState === true)
				.map(layer => layer.key)
		)
	);
	
	if (pending) return (
		<div className="w-full h-[40vh] relative overflow-hidden">
			<div className="absolute inset-0 bg-muted animate-pulse" />
		</div>
	);
	
	const initialViewState = {
		longitude: airport.longitude_deg,
		latitude: airport.latitude_deg,
		zoom: mobile ? 11.9 : 12.5,
	};
	
	return (
		<div
			ref={mapContainerRef}
			className="relative data-[fullscreen='true']:h-screen data-[fullscreen='false']:h-[40vh] overflow-hidden"
			data-fullscreen={false}
		>
			<Map
				mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
				initialViewState={initialViewState}
				minZoom={11.5}
				maxZoom={25}
				projection="mercator"
				style={{ width: "100%", height: "100%" }}
				attributionControl={false}
				mapStyle={
					theme === 'dark'
						? 'mapbox://styles/mapbox/dark-v11'
						: 'mapbox://styles/mapbox/light-v11'
				}
			>
				<MapControls
					ref={mapContainerRef}
					position="top-right"
					initialView={initialViewState}
					layers={layers}
					layerState={enabledLayers}
					syncLayers={setEnabledLayers}
					customControls={[
						<MobileQuickLinksControl
							key="mobile-quick-links-map-control"
							airport={airport}
						/>
					]}
					showFullscreen
					showReset
				/>
				
				{enabledLayers.has("runways") && airport.runways.map((runway) => (
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
				
				{enabledLayers.has("navaids") && airport.navaids.map(navaid => (
					<Marker
						longitude={navaid.longitude_deg!}
						latitude={navaid.latitude_deg!}
						anchor="center"
						key={navaid.id}
					>
						<div className="flex flex-col items-center">
							<div className="text-xs font-mono bg-blue-500 text-white px-1 rounded mb-1">
								{navaid.type}
							</div>
						</div>
					</Marker>
				))}
			</Map>
			
			<div className="block sm:hidden absolute left-0 top-0 min-w-full border border-border/50 bg-white/65 dark:bg-[#0a0a0a]/65 backdrop-blur-sm">
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
			
			<div className="hidden sm:block absolute left-2 top-2 min-w-[calc(100%-1.15rem)] sm:min-w-auto sm:max-w-sm rounded-lg border border-border/50 bg-white/65 dark:bg-[#0a0a0a]/65 p-5 backdrop-blur-sm">
				<div className="mb-2 flex items-center gap-2">
					<span className="rounded bg-zinc-300 dark:bg-zinc-800 px-2 py-0.5 font-mono text-xs text-zinc-800 dark:text-zinc-400">
						<span className="text-zinc-500 dark:text-zinc-300 text-xs align-text-top">IATA</span>{" "}
						{airport.iata_code}
					</span>
					<span className="rounded bg-zinc-300 dark:bg-zinc-800 px-2 py-0.5 font-mono text-xs text-zinc-800 dark:text-zinc-400">
						<span className="text-zinc-500 dark:text-zinc-300 text-xs align-text-top">ICAO</span>{" "}
						{airport.icao_code}
					</span>
					<span className="rounded bg-blue-200 dark:bg-blue-800/50 px-2 py-0.5 font-mono text-xs text-blue-700 dark:text-blue-400">
						{formatAirportLocation(airport)}
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
			
			<div className="absolute sm:hidden bottom-0 w-full bg-linear-to-t from-zinc-500/80 via-zinc-400/40 dark:from-black/80 dark:via-black/50 to-transparent pt-10 pb-3">
				<div className="px-4 pt-2 pb-0.5 text-xl font-semibold text-zinc-800 dark:text-white">
					{shortenAirportName(airport.name)}
				</div>
				<div className="px-4 text-xs text-zinc-800 dark:text-white/80">
					<div className="mb-2 flex items-center gap-2">
						<span className="rounded bg-blue-200 dark:bg-blue-950 px-2 py-0.5 font-mono text-xs text-blue-700 dark:text-blue-400">
							{formatAirportLocation(airport)}
						</span>
						<span className="rounded bg-zinc-300 dark:bg-zinc-800 px-2 py-0.5 font-mono text-xs text-zinc-800 dark:text-zinc-400">
							<span className="text-zinc-500 dark:text-zinc-300 text-xs align-text-top">IATA</span>{" "}
							{airport.iata_code}
						</span>
						<span className="rounded bg-zinc-300 dark:bg-zinc-800 px-2 py-0.5 font-mono text-xs text-zinc-800 dark:text-zinc-400">
							<span className="text-zinc-500 dark:text-zinc-300 text-xs align-text-top">ICAO</span>{" "}
							{airport.icao_code}
						</span>
					</div>
				</div>
			</div>
			
			<div className="sm:absolute left-2 bottom-2 flex gap-1">
				{airport.home_link && (
					<QuickLink href={airport.home_link}>
						<AirportSiteFavicon url={airport.home_link} />
						{mobile && "Website"}
						{mobile !== undefined && !mobile && getUrlDomain(airport.home_link, "Website")}
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