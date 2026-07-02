import Map from "react-map-gl/mapbox";

import { useTheme } from "next-themes";
import { useRef, useState } from "react";
import { Skeleton } from "~/components/ui/skeleton";
import { useMobile } from "~/components/mobile-provider";
import { PlaneRegistration } from "@skywatch/gateway/schemas";
import { MapControls, MapLayers } from "~/components/ui/map-controls";
import { useQuery } from "@tanstack/react-query";
import { orpc } from "~/lib/gateway";
import { AnimatedPlaneIcon } from "./plane-icon";
import { PlaneTrail } from "./plane-track";

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

export const PlaneAdsbMap: React.FC<{ plane: PlaneRegistration }> = ({ plane }) => {
	const { data } = useQuery(orpc.planes.adsb.experimental_streamedOptions({
		input: { registration: plane.n_number },
		queryFnOptions: {
			refetchMode: "append",
			maxChunks: 100
		},
		retry: true,
		retryDelay: 1000,
		enabled: false,
	}));
	
	const mapContainerRef = useRef<HTMLDivElement>(null);
	const layers: MapLayers = [];
	
	const { mobile, pending } = useMobile();
	const { resolvedTheme: theme } = useTheme();
	const [enabledLayers, setEnabledLayers] = useState<Set<string>>(
		() => new Set<string>(
			layers
				.filter(layer => !layer.defaultState || layer.defaultState === true)
				.map(layer => layer.key)
		)
	);
	
	// if (pending) return (
	// 	<div className="w-full h-[40vh] relative overflow-hidden">
	// 		<div className="absolute inset-0 bg-muted animate-pulse" />
	// 	</div>
	// );
	
	const initialView = {
		latitude: 37,
		longitude: -97.5,
		zoom: 3.25
	};
	
	// if (!data || !data.at(-1)?.ac) return (
	// 	<>aog - no adsb data</>
	// )
	
	const adsb = data?.at(-1)?.ac[0];
	const track = data
		?.map(record => record?.ac[0])
		.map(point => ({
			lat: point?.lat,
			lon: point?.lon,
			alt: point?.alt_baro,
		}));

	return (
		<div
			ref={mapContainerRef}
			className="w-full h-full relative data-[fullscreen='true']:h-screen data-[fullscreen='false']:h-[43.05vh] overflow-hidden"
			data-fullscreen={false}
		>
			<Map
				mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
				initialViewState={initialView}
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
					initialView={initialView}
					layers={layers}
					layerState={enabledLayers}
					syncLayers={setEnabledLayers}
					showFullscreen
					showReset
				/>
				
				{!!adsb && (
					<AnimatedPlaneIcon
						lat={adsb.lat}
						lon={adsb.lon}
						track={adsb.track}
					/>
				)}
				
				{track && track.length > 0 && (
					<PlaneTrail track={track} />
				)}
			</Map>
		</div>
	);
};