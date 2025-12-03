import { toast } from "sonner";
import { unwrap } from "~/lib/actions";
import { Button } from "~/components/ui/button";
import { AirportWithJoins } from "~/lib/airports";
import { Skeleton } from "~/components/ui/skeleton";
import { ErrorSection } from "~/components/error-section";
import { PropsWithChildren, useEffect, useState } from "react";

import {
	CloudCover,
	fetchWeatherReport,
	FlightCategory,
	MetarResponse
} from "~/lib/weather";

import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from "~/components/ui/dialog";

import {
	CloudRain,
	Droplets,
	FileText,
	Gauge,
	Plane,
	Tally1,
	Tally2,
	Tally3,
	Tally4,
	Tally5,
	ThermometerSun,
	TrendingUp,
	Wind
} from "lucide-react";

type MeterologicalReportProps = {
	airport: AirportWithJoins;
}

const getCloudCoverLabel = (cover: CloudCover) => {
	switch (cover) {
		case "FEW": return "Few"
		case "SCT": return "Scattered"
		case "BKN": return "Broken"
		case "OVC": return "Overcast"
		
		case "SKC":
		case "CLR": return "Clear"
		
		default:    return cover
	}
}

const getFlightRulesLabel = (category: FlightCategory) => {
	switch (category) {
		case "MVFR": return "Marginal VFR";
		case "LIFR": return "Low IFR";
		default: return category;
	}
}

const cToF = (c: number) => Math.round((c * 9) / 5 + 32);

const formatVisibility = (visibility: string | number) => {
	if (typeof visibility === "string") {
		if (!visibility.includes("+")) return visibility + " SM";
		return `>${visibility.replace("+", "")} SM`;
	}
	
	return `${visibility} SM`;
}

const formatAltToFL = (alt: number) => {
	if (alt >= 10000) return `FL${Math.floor(alt / 100)}`;
	if (alt >= 1000) return `FL0${Math.floor(alt / 100)}`;
	return alt + "ft";
}

const FullReport: React.FC<PropsWithChildren<{ metar: MetarResponse }>> = ({ children, metar }) => (
	<Dialog>
		<DialogTrigger asChild>
			{children}
		</DialogTrigger>
		<DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-white dark:bg-zinc-950 border-black/10 dark:border-white/10">
			<DialogHeader>
				<DialogTitle className="text-black dark:text-white">Full Weather Report</DialogTitle>
			</DialogHeader>
			<div className="space-y-5 mt-4">
				<div>
					<h3 className="text-xs font-semibold text-black/80 dark:text-white/80 mb-1.5 flex items-center gap-1.5 uppercase tracking-wide">
						<ThermometerSun className="h-3.5 w-3.5" />
						Current Observations
					</h3>
					<div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
						<div className="flex justify-between">
							<span className="text-black/70 dark:text-white/40">Temperature:</span>
							<span className="text-black/90 dark:text-white/90 font-mono">
								{cToF(metar.temp)}°F ({metar.temp}°C)
							</span>
						</div>
						
						<div className="flex justify-between">
							<span className="text-black/70 dark:text-white/40">Visibility:</span>
							<span className="text-black/90 dark:text-white/90 font-mono">
								{formatVisibility(metar.visib)}
							</span>
						</div>
						
						<div className="flex justify-between">
							<span className="text-black/70 dark:text-white/40">Dew Point:</span>
							<span className="text-black/90 dark:text-white/90 font-mono">
								{cToF(metar.dewp)}°F ({metar.dewp}°C)
							</span>
						</div>
						
						<div className="flex justify-between">
							<span className="text-black/70 dark:text-white/40">Flight Rules:</span>
							<span className="text-black/90 dark:text-white/90 font-mono">{getFlightRulesLabel(metar.fltCat)}</span>
						</div>
						
						<div className="flex justify-between">
							<span className="text-black/70 dark:text-white/40">Altimeter:</span>
							<span className="text-black/90 dark:text-white/90 font-mono">{(metar.altim / 33.8639).toFixed(2)} inHg</span>
						</div>
						
						<div className="flex justify-between">
							<span className="text-black/70 dark:text-white/40">Wind:</span>
							<span className="text-black/90 dark:text-white/90 font-mono">
								{metar.wdir != null
									? `${metar.wdir.toString().padStart(3, "0")}° at ${metar.wspd}kt`
									: `${metar.wspd}kt`}
							</span>
						</div>
						
						{metar.slp && (
							<div className="flex justify-between">
								<span className="text-black/70 dark:text-white/40">Sea Level:</span>
								<span className="text-black/90 dark:text-white/90 font-mono">{(metar.slp / 33.8639).toFixed(1)} inHg</span>
							</div>
						)}
						
						{metar.wgst && (
							<div className="flex justify-between">
								<span className="text-black/70 dark:text-white/40">Gust:</span>
								<span className="text-black/90 dark:text-white/90 font-mono">
									{metar.wgst}kt
								</span>
							</div>
						)}
						
						{metar.wxString && (
							<div className="flex justify-between">
								<span className="text-black/70 dark:text-white/40">Weather:</span>
								<span className="text-black/90 dark:text-white/90 font-mono">{metar.wxString}</span>
							</div>
						)}
					</div>
				</div>

				{metar.clouds && metar.clouds.length > 0 && (
					<div>
						<h3 className="text-xs font-semibold text-black/80 dark:text-white/80 mb-1.5 flex items-center gap-1.5 uppercase tracking-wide">
							<CloudRain className="h-3.5 w-3.5" />
							Cloud Layers
						</h3>
						<div className="flex flex-col space-y-1">
							{metar.clouds.map((cloud, idx) => (
								<div key={idx} className="text-xs text-black/70 dark:text-white/70 font-mono flex justify-between">
									<span>{getCloudCoverLabel(cloud.cover)}</span>
									<span>{cloud.base.toLocaleString()} ft</span>
								</div>
							))}
						</div>
					</div>
				)}

				{(metar.maxT != null || metar.minT != null || metar.precip != null || metar.pcp3hr != null || metar.pcp6hr != null || metar.snow != null || metar.presTend != null) && (
					<div>
						<h3 className="text-xs font-semibold text-black/80 dark:text-white/80 mb-1.5 flex items-center gap-1.5 uppercase tracking-wide">
							<TrendingUp className="h-3.5 w-3.5" />
							Extremes &amp; Trends
						</h3>
						<div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
							{metar.maxT != null && (
								<div className="flex justify-between">
									<span className="text-black/70 dark:text-white/40">Max Temp:</span>
									<span className="text-black/90 dark:text-white/90 font-mono">
										{cToF(metar.maxT)}°F ({metar.maxT}°C)
									</span>
								</div>
							)}
							{metar.minT != null && (
								<div className="flex justify-between">
									<span className="text-black/70 dark:text-white/40">Min Temp:</span>
									<span className="text-black/90 dark:text-white/90 font-mono">
										{cToF(metar.minT)}°F ({metar.minT}°C)
									</span>
								</div>
							)}
							{metar.precip != null && (
								<div className="flex justify-between">
									<span className="text-black/70 dark:text-white/40">Precip (1hr):</span>
									<span className="text-black/90 dark:text-white/90 font-mono">{metar.precip.toFixed(2)} in</span>
								</div>
							)}
							{metar.pcp3hr != null && (
								<div className="flex justify-between">
									<span className="text-black/70 dark:text-white/40">Precip (3hr):</span>
									<span className="text-black/90 dark:text-white/90 font-mono">{metar.pcp3hr.toFixed(2)} in</span>
								</div>
							)}
							{metar.pcp6hr != null && (
								<div className="flex justify-between">
									<span className="text-black/70 dark:text-white/40">Precip (6hr):</span>
									<span className="text-black/90 dark:text-white/90 font-mono">{metar.pcp6hr.toFixed(2)} in</span>
								</div>
							)}
							{metar.presTend != null && (
								<div className="flex justify-between">
									<span className="text-black/70 dark:text-white/40">Pressure (3hr):</span>
									<span className="text-black/90 dark:text-white/90 font-mono">
										{metar.presTend > 0 ? "+" : ""}
										{metar.presTend} mb
									</span>
								</div>
							)}
							{metar.snow != null && (
								<div className="flex justify-between">
									<span className="text-black/70 dark:text-white/40">Snow Depth:</span>
									<span className="text-black/90 dark:text-white/90 font-mono">{(metar.snow / 100).toFixed(1)} in</span>
								</div>
							)}
						</div>
					</div>
				)}

				<div>
					<h3 className="text-xs font-semibold text-black/80 dark:text-white/80 mb-1.5 uppercase tracking-wide">Meteorological Aerodrome Report (METAR)</h3>
					<div className="bg-gray-100/40 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded p-2">
						<div className="text-xs font-mono text-black/70 dark:text-white/70 leading-relaxed break-words">{metar.rawOb}</div>
					</div>
				</div>

				{metar.rawTaf && (
					<div>
						<h3 className="text-xs font-semibold text-black/80 dark:text-white/80 mb-1.5 uppercase tracking-wide">
							Terminal Aerodrome Forecast (TAF)
						</h3>
						<div className="bg-gray-100/40 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded p-2">
							<div className="text-xs font-mono text-black/70 dark:text-white/70 leading-relaxed break-words">{metar.rawTaf}</div>
						</div>
					</div>
				)}
			</div>
		</DialogContent>
	</Dialog>
)

export const MeterologicalReport: React.FC<MeterologicalReportProps> = ({ airport }) => {
	const [metar, setMetar] = useState<MetarResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);
	
	const refresh = () => {
		setLoading(true);
		fetchWeatherReport(airport.iata_code!)
			.then(unwrap)
			.then(setMetar)
			.catch(err => {
				setError(err);
				toast('Error loading meterological report', {
					description: err.message,
					action: {
						label: "Retry",
						onClick: refresh
					}
				})
			})
			.finally(() => setLoading(false));
	}
	
	useEffect(() => {
		refresh();
	}, []);
	
	if (loading) return <>loading</>;
	if (!metar || error) return (
		<div className="border-b border-white/10">
			<div className="flex flex-row px-3 py-2 justify-between">
				<div className="flex flex-row space-x-2 items-center">
					<span className="text-md font-semibold pointer-events-none">
						Meteorological Report
					</span>
				</div>
				<Skeleton className="h-6 w-24" />
			</div>

			<div className="border-t">
				<ErrorSection
					title="Error loading runway conditions"
					className="border-t rounded-none border-solid"
					error={error?.message}
					refresh={refresh}
				/>
			</div>
		</div>
	);
	
	return (
		<div className="border-b border-white/10">
			<div className="flex flex-row px-3 py-2 justify-between">
				<div className="flex flex-row space-x-2 items-center">
					<span className="text-md font-semibold pointer-events-none">
						Meteorological Report
					</span>
				</div>
				<FullReport metar={metar}>
					<Button
						variant="ghost"
						size="sm"
						className="h-6 w-6 p-0 hover:bg-black/10 dark:hover:bg-white/10 text-black/60 dark:text-white/60 hover:text-black/90 dark:hover:text-white/90"
					>
						<FileText className="h-3.5 w-3.5" />
					</Button>
				</FullReport>
			</div>

			<div className="p-3 border-t">
				<div className="grid grid-cols-3 gap-3">
					<div className="flex items-start gap-2">
						<ThermometerSun className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
						<div className="flex-1 min-w-0">
							<div className="text-xs text-black/60 dark:text-white/80 mb-0.5">Temp / Dew Point</div>
							<div className="font-mono text-sm text-black/80 dark:text-white/90">
								{cToF(metar.temp)}°F / {cToF(metar.dewp)}°F
							</div>
							<div className="text-xs text-black/40 dark:text-white/40 mt-0.5">
								{metar.temp}°C / {metar.dewp}°C
							</div>
						</div>
					</div>

					<div className="flex items-start gap-2">
						<Wind className="h-4 w-4 text-cyan-600 dark:text-cyan-400 mt-0.5 shrink-0" />
						<div className="flex-1 min-w-0">
							<div className="text-xs text-black/60 dark:text-white/80 mb-0.5">Wind</div>
							<div className="font-mono text-sm text-black/80 dark:text-white/90">
								{metar.wdir != null
									? `${metar.wspd}kt at ${metar.wdir.toString().padStart(3, "0")}°`
									: `${metar.wspd}kt`}
							</div>
							<div className="font-mono text-sm text-black/80 dark:text-white/90">
								{metar.wgst && `${metar.wgst}kt gust`}
							</div>
						</div>
					</div>

					<div className="flex items-start gap-2">
						<Droplets className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
						<div className="flex-1 min-w-0">
							<div className="text-xs text-black/60 dark:text-white/80 mb-0.5">Visibility</div>
							<div className="font-mono text-sm text-black/80 dark:text-white/90">
								{formatVisibility(metar.visib)}
							</div>
						</div>
					</div>

					<div className="flex items-start gap-2">
						<Gauge className="h-4 w-4 text-purple-600 dark:text-purple-400 mt-0.5 shrink-0" />
						<div className="flex-1 min-w-0">
							<div className="text-xs text-black/60 dark:text-white/80 mb-0.5">Altimeter</div>
							<div className="font-mono text-sm text-black/80 dark:text-white/90">{(metar.altim / 33.8639).toFixed(2)} inHg</div>
							{metar.slp && (
								<div className="text-xs text-black/40 dark:text-white/40 mt-0.5">
									Sea Level: {(metar.slp / 33.8639).toFixed(1)} inHG
								</div>
							)}
						</div>
					</div>

					{metar.clouds && metar.clouds.length > 0 && (
						<div className="flex items-start gap-2">
							<CloudRain className="h-4 w-4 text-slate-600 dark:text-slate-400 mt-0.5 shrink-0" />
							<div className="flex-1 min-w-0">
								<div className="text-xs text-black/60 dark:text-white/80 mb-1">Clouds</div>
								
								{metar.clouds.length === 0 && (
									<div className="font-mono text-sm text-black/80 dark:text-white/90">
										None
									</div>
								)}
								
								{metar.clouds.length > 0 && (
									<div className="space-y-0.5">
										{metar.clouds.map((cloud, idx) => (
											<div key={idx} className="flex flex-row space-x-2 text-xs text-black/80 dark:text-white/90 font-mono">
												<div className="px-2 bg-blue-300 dark:bg-blue-500 rounded-md">{formatAltToFL(cloud.base)}</div>
												<span>{getCloudCoverLabel(cloud.cover)}</span>
											</div>
										))}
									</div>
								)}
							</div>
						</div>
					)}

					<div className="flex items-start gap-2">
						<Plane className="h-4 w-4 mt-0.5 text-amber-600 dark:text-amber-400 shrink-0" />
						<div className="flex-1 min-w-0">
							<div className="text-xs text-black/60 dark:text-white/80 mb-0.5">Flight Category</div>
							<div className="text-sm text-black/80 dark:text-white/90">{getFlightRulesLabel(metar.fltCat)}</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}