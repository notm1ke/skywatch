import { Skeleton } from "../ui/skeleton";
import { cn, shortenAirportName } from "~/lib/utils";
import { useIsMounted } from "~/hooks/use-is-mounted";
import { HeaderStats } from "@skywatch/gateway/schemas";

const stateColors: Record<string, { color: string, badge: string }> = {
	AL: { color: "text-yellow-500 dark:text-yellow-400", badge: "bg-yellow-200 dark:bg-yellow-600" },
	AK: { color: "text-blue-700 dark:text-blue-300", badge: "bg-blue-200 dark:bg-blue-500" },
	AZ: { color: "text-green-600 dark:text-green-400", badge: "bg-green-200 dark:bg-green-600" },
	AR: { color: "text-red-500 dark:text-red-400", badge: "bg-red-200 dark:bg-red-600" },
	CA: { color: "text-emerald-500 dark:text-emerald-400", badge: "bg-emerald-200 dark:bg-emerald-600" },
	CO: { color: "text-green-600 dark:text-green-400", badge: "bg-green-200 dark:bg-green-600" },
	CT: { color: "text-yellow-400 dark:text-yellow-300", badge: "bg-yellow-100 dark:bg-yellow-500" },
	DE: { color: "text-blue-700 dark:text-blue-300", badge: "bg-blue-200 dark:bg-blue-500" },
	FL: { color: "text-yellow-400 dark:text-yellow-300", badge: "bg-yellow-100 dark:bg-yellow-500" },
	GA: { color: "text-orange-500 dark:text-orange-400", badge: "bg-orange-200 dark:bg-orange-600" },
	HI: { color: "text-emerald-600 dark:text-emerald-400", badge: "bg-emerald-200 dark:bg-emerald-600" },
	ID: { color: "text-amber-500 dark:text-amber-400", badge: "bg-amber-200 dark:bg-amber-600" },
	IL: { color: "text-blue-700 dark:text-blue-300", badge: "bg-blue-200 dark:bg-blue-500" },
	IN: { color: "text-emerald-200 dark:text-emerald-300", badge: "bg-emerald-100 dark:bg-emerald-500" },
	IA: { color: "text-rose-500 dark:text-rose-400", badge: "bg-rose-200 dark:bg-rose-600" },
	KS: { color: "text-emerald-600 dark:text-emerald-400", badge: "bg-emerald-200 dark:bg-emerald-600" },
	KY: { color: "text-yellow-500 dark:text-yellow-400", badge: "bg-yellow-200 dark:bg-yellow-600" },
	LA: { color: "text-cyan-600 dark:text-cyan-400", badge: "bg-cyan-200 dark:bg-cyan-600" },
	ME: { color: "text-emerald-400 dark:text-emerald-300", badge: "bg-emerald-100 dark:bg-emerald-500" },
	MD: { color: "text-fuchsia-600 dark:text-fuchsia-400", badge: "bg-fuchsia-200 dark:bg-fuchsia-600" },
	MA: { color: "text-green-600 dark:text-green-400", badge: "bg-green-200 dark:bg-green-600" },
	MI: { color: "text-yellow-500 dark:text-yellow-400", badge: "bg-yellow-200 dark:bg-yellow-600" },
	MN: { color: "text-blue-700 dark:text-blue-300", badge: "bg-blue-200 dark:bg-blue-500" },
	MS: { color: "text-amber-600 dark:text-amber-400", badge: "bg-amber-200 dark:bg-amber-600" },
	MO: { color: "text-sky-600 dark:text-sky-400", badge: "bg-sky-200 dark:bg-sky-600" },
	MT: { color: "text-green-600 dark:text-green-400", badge: "bg-green-200 dark:bg-green-600" },
	NC: { color: "text-yellow-600 dark:text-yellow-400", badge: "bg-yellow-200 dark:bg-yellow-600" },
	ND: { color: "text-blue-700 dark:text-blue-300", badge: "bg-blue-200 dark:bg-blue-500" },
	NE: { color: "text-amber-600 dark:text-amber-400", badge: "bg-amber-200 dark:bg-amber-600" },
	NH: { color: "text-rose-500 dark:text-rose-400", badge: "bg-rose-200 dark:bg-rose-600" },
	NJ: { color: "text-emerald-600 dark:text-emerald-400", badge: "bg-emerald-200 dark:bg-emerald-600" },
	NM: { color: "text-yellow-600 dark:text-yellow-400", badge: "bg-yellow-200 dark:bg-yellow-600" },
	NV: { color: "text-sky-700 dark:text-sky-300", badge: "bg-sky-200 dark:bg-sky-500" },
	NY: { color: "text-emerald-500 dark:text-emerald-400", badge: "bg-emerald-200 dark:bg-emerald-600" },
	OH: { color: "text-rose-600 dark:text-rose-400", badge: "bg-rose-200 dark:bg-rose-600" },
	OK: { color: "text-teal-600 dark:text-teal-400", badge: "bg-teal-200 dark:bg-teal-600" },
	OR: { color: "text-yellow-700 dark:text-yellow-300", badge: "bg-yellow-200 dark:bg-yellow-500" },
	PA: { color: "text-cyan-700 dark:text-cyan-300", badge: "bg-cyan-200 dark:bg-cyan-500" },
	RI: { color: "text-emerald-500 dark:text-emerald-400", badge: "bg-emerald-200 dark:bg-emerald-600" },
	SC: { color: "text-orange-600 dark:text-orange-400", badge: "bg-orange-200 dark:bg-orange-600" },
	SD: { color: "text-lime-600 dark:text-lime-400", badge: "bg-lime-200 dark:bg-lime-600" },
	TN: { color: "text-yellow-600 dark:text-yellow-400", badge: "bg-yellow-200 dark:bg-yellow-600" },
	TX: { color: "text-cyan-700 dark:text-cyan-300", badge: "bg-cyan-200 dark:bg-cyan-500" },
	UT: { color: "text-emerald-600 dark:text-emerald-400", badge: "bg-emerald-200 dark:bg-emerald-600" },
	VA: { color: "text-orange-600 dark:text-orange-400", badge: "bg-orange-200 dark:bg-orange-600" },
	VT: { color: "text-green-600 dark:text-green-400", badge: "bg-green-200 dark:bg-green-600" },
	WA: { color: "text-orange-500 dark:text-orange-400", badge: "bg-orange-200 dark:bg-orange-600" },
	WI: { color: "text-blue-700 dark:text-blue-300", badge: "bg-blue-200 dark:bg-blue-500" },
	WV: { color: "text-emerald-600 dark:text-emerald-400", badge: "bg-emerald-200 dark:bg-emerald-600" },
	WY: { color: "text-red-600 dark:text-red-400", badge: "bg-red-200 dark:bg-red-600" },
}

const getAirportColor = (isoRegion: string) => {
	const [_, state] = isoRegion.split("-");
	return stateColors[state] || "";
}

const stripRegionality = (name: string) => name
	.replaceAll("Intl", "")
	.replace("Ntl", "")
	.replace("Cnty", "")
	.replace("Metro", "");

export const TopAirportsSkeleton = () => {
	const mounted = useIsMounted();
	if (!mounted) return (
		<div className="space-y-2">
			<h2 className="my-0 font-mono font-medium text-sm tracking-tight mb-0.5 uppercase text-zinc-900 dark:text-zinc-100">
				Top airports by observed traffic
			</h2>
			<ul className="list-none pl-0">
				{Array.from({ length: 10 }).map((_, i) => (
					<li key={`top-airports-skeleton-${i}`} className="flex items-center gap-3 py-px">
						<div className="flex items-center gap-2 min-w-[5ch]">
							<Skeleton className="w-3 h-3" />
							<Skeleton className="w-12 h-5" />
						</div>
						<div className="flex-1" />
						<Skeleton className="w-[5ch] h-5" />
						<Skeleton className="w-[5ch] h-5" />
					</li>
				))}
			</ul>
		</div>
	)
	
	return (
		<div className="space-y-2">
			<h2 className="my-0 font-mono font-medium text-sm tracking-tight mb-0.5 uppercase text-zinc-900 dark:text-zinc-100">
				Top airports by observed traffic
			</h2>
			<ul className="list-none pl-0">
				{Array.from({ length: 10 }).map((_, i) => (
					<li key={`top-airports-skeleton-${i}`} className="flex items-center gap-3 py-px">
						<div className="flex items-center gap-2 min-w-[5ch]">
							<Skeleton className="w-3 h-3" />
							<Skeleton className="h-5" style={{ width: `${Math.floor(Math.random() * 15) + 10}ch` }} />
						</div>
						<div className="flex-1" />
						<Skeleton className="w-[5ch] h-5" />
						<Skeleton className="w-[5ch] h-5" />
					</li>
				))}
			</ul>
		</div>
	);
} 

const AirportIataBadge: React.FC<{ iata_code: string, color: string }> = ({ iata_code, color }) => (
	<span className={cn("text-sm font-bold font-mono px-2 rounded-sm", color)}>{iata_code}</span>
)

export const TopAirports: React.FC<{ data: HeaderStats }> = ({ data }) => {
	return (
		<div className="space-y-2">
			<h2 className="my-0 font-mono font-medium text-sm tracking-tight mb-0.5 uppercase text-zinc-900 dark:text-zinc-100">
				Top airports by observed traffic
			</h2>
			<ul className="list-none pl-0">
				{data.top10.map((airport, i) => {
					const { color, badge } = getAirportColor(airport.iso_region);
					return (
						<li key={`top-airports-${airport.iata_code}-${i}`} className="flex items-center gap-3 py-px">
							<div className="flex items-center gap-2 min-w-[5ch]">
								<AirportIataBadge iata_code={airport.iata_code} color={badge} />
								<h3 className={cn("my-0 font-medium font-mono text-sm", color)}>
									{stripRegionality(shortenAirportName(airport.name))}
								</h3>
							</div>
							<div className="flex-1" />
							<span className="tabular-nums text-sm text-zinc-900 dark:text-zinc-300">
								{airport.flights.toLocaleString()}
							</span>
							<span className="tabular-nums text-xs text-muted-foreground min-w-[5ch] text-right">
								{((airport.flights / data.total) * 100).toFixed(1)}%
							</span>
						</li>
					)
				})}
			</ul>
		</div>
	)
}
