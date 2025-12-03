import moment from "moment-timezone";

import { toast } from "sonner";
import { unwrap } from "~/lib/actions";
import { cn, padZero } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { AirportWithJoins } from "~/lib/airports";
import { CircleHelp, Clock4 } from "lucide-react";
import { Skeleton } from "~/components/ui/skeleton";
import { ErrorSection } from "~/components/error-section";
import { ScrollArea, ScrollBar } from "~/components/ui/scroll-area";
import { PropsWithChildren, useEffect, useMemo, useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";

import {
	fetchRvrForAirport,
	RvrProbe,
	RvrProbeType,
	RvrResponse
} from "~/lib/rvr";

import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from "~/components/ui/dialog";

type RunwayConditionsProps = {
	airport: AirportWithJoins;
}

const chevronAnimationStyles = `
	@keyframes chevron-up {
		0% {
			background-position: 0 0;
		}
		100% {
			background-position: 0 -60px;
		}
	}
	
	@keyframes chevron-down {
		0% {
			background-position: 0 -10px;
		}
		100% {
			background-position: 0 60px;
		}
	}
	
	.chevron-bg-increasing {
		animation: chevron-up 3s linear infinite;
	}
	
	.chevron-bg-decreasing {
		animation: chevron-down 3s linear infinite;
	}
`;

const getVisibilityColor = (visibility: number) => {
	// Max viz
	if (visibility === 6001) return "bg-emerald-500/30 border-emerald-500 text-emerald-700 dark:text-emerald-300";
	
	// 2500-6000
	if (visibility >= 2500)  return "bg-lime-500/30 border-lime-500 text-lime-700 dark:text-lime-300";
	
	// 1300-2499
	if (visibility >= 1300)  return "bg-yellow-500/30 border-yellow-500 text-yellow-700 dark:text-yellow-300";
	
	// 800-1299
	if (visibility >= 800)   return "bg-orange-500/30 border-orange-500 text-orange-700 dark:text-orange-300";
	
	 // 0-799
	if (visibility >= 0)     return "bg-red-500/30 border-red-500 text-red-700 dark:text-red-300";
	
	// Fault or no data
	return "bg-zinc-400 dark:bg-zinc-800 border-zinc-500 dark:border-zinc-700 text-zinc-700 dark:text-zinc-400";
}

const getAnimationStrokeColor = (visibility: number) => {
	if (visibility === 6001) return "rgb(0, 122, 85, 0.4)"; // Max viz
	if (visibility >= 2500) return "rgb(73, 125, 0, 0.4)"; // 2500-6000
	if (visibility >= 1300) return "rgb(166, 95, 0, 0.4)"; // 1300-2499
	if (visibility >= 800) return "rgb(202, 53, 0, 0.4)"; // 800-1299
	if (visibility >= 0) return "rgb(193, 0, 7, 0.4)"; // 0-799
	return "rgb(82, 82, 92, 0.4)"; // Fault or no data
}

const formatVisibility = (visibilityFt: number) => {
	if (visibilityFt === -1) return "INOP";
	if (visibilityFt === 6001) return ">6,000 ft";
	return `${visibilityFt.toLocaleString()} ft`;
}

const getChevronBackground = (trend: string, visibilityFt: number) => {
	if (trend === "steady") return {
		backgroundImage: "none",
		animationClass: ""
	};

	const strokeColor = getAnimationStrokeColor(visibilityFt);

	if (trend === "increasing") {
		const svg = `data:image/svg+xml,%3Csvg width='100' height='120' xmlns='http://www.w3.org/2000/svg' preserveAspectRatio='none'%3E%3Cpath d='M0 25 L50 10 L100 25' stroke='${encodeURIComponent(strokeColor)}' strokeWidth='3' fill='none' strokeLinecap='round' strokeLinejoin='round'/%3E%3Cpath d='M0 85 L50 70 L100 85' stroke='${encodeURIComponent(strokeColor)}' strokeWidth='3' fill='none' strokeLinecap='round' strokeLinejoin='round'/%3E%3C/svg%3E`;
		return {
			backgroundImage: `url("${svg}")`,
			animationClass: "chevron-bg-increasing",
		};
	}
	
	const svg = `data:image/svg+xml,%3Csvg width='100' height='120' xmlns='http://www.w3.org/2000/svg' preserveAspectRatio='none'%3E%3Cpath d='M0 2 L50 17 L100 2' stroke='${encodeURIComponent(strokeColor)}' strokeWidth='3' fill='none' strokeLinecap='round' strokeLinejoin='round'/%3E%3Cpath d='M0 62 L50 77 L100 62' stroke='${encodeURIComponent(strokeColor)}' strokeWidth='3' fill='none' strokeLinecap='round' strokeLinejoin='round'/%3E%3C/svg%3E`;
	return {
		backgroundImage: `url("${svg}")`,
		animationClass: "chevron-bg-decreasing",
	};
}

const Tutorial: React.FC<PropsWithChildren> = ({ children }) => (
	<Dialog>
		<DialogTrigger asChild>{children}</DialogTrigger>
		<DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
			<DialogHeader>
				<DialogTitle>Runway Visual Range</DialogTitle>
			</DialogHeader>

			<div className="space-y-6 text-sm">
				<div>
					<h3 className="font-semibold text-base mb-2">What is RVR?</h3>
					<p className="text-zinc-700 dark:text-zinc-400">
						Runway Visual Range (RVR) measures how far pilots can see down the runway, critical for takeoffs and
						landings in low visibility conditions like fog, rain, or snow.
					</p>
				</div>

				<div>
					<h3 className="font-semibold text-base mb-3">Measurement Points</h3>
					<p className="text-zinc-700 dark:text-zinc-400 mb-3">Each runway is measured at three locations:</p>

					<div className="flex flex-col space-y-2">
						<div className="flex flex-row">
							<div className="font-mono text-lime-700 dark:text-lime-300 font-semibold min-w-24">Touchdown</div>
							<div className="text-zinc-700 dark:text-zinc-400">Where aircraft wheels first contact the runway</div>
						</div>
						<div className="flex flex-row">
							<div className="font-mono text-lime-700 dark:text-lime-300 font-semibold min-w-24">Midpoint</div>
							<div className="text-zinc-700 dark:text-zinc-400">The middle of the runway</div>
						</div>
						<div className="flex flex-row">
							<div className="font-mono text-lime-700 dark:text-lime-300 font-semibold min-w-24">Rollout</div>
							<div className="text-zinc-700 dark:text-zinc-400">The far end where aircraft complete their landing roll</div>
						</div>
					</div>
				</div>

				<div>
					<h3 className="font-semibold text-base mb-3">Color Coding</h3>
					<p className="text-zinc-700 dark:text-zinc-400 mb-3">Visibility ranges are color-coded based on operational minimums:</p>

					<div className="space-y-2">
						<div className="flex items-center gap-3">
							<div className="w-16 h-6 bg-emerald-500/30 border border-emerald-500 rounded" />
							<div className="text-zinc-700 dark:text-zinc-400">
								<span className="text-emerald-700 dark:text-emerald-300 font-semibold">&gt;6,000 ft</span> - Excellent visibility
							</div>
						</div>
						<div className="flex items-center gap-3">
							<div className="w-16 h-6 bg-lime-500/30 border border-lime-500 rounded" />
							<div className="text-zinc-700 dark:text-zinc-400">
								<span className="text-lime-700 dark:text-lime-300 font-semibold">2,500-6,000 ft</span> - Good visibility
							</div>
						</div>
						<div className="flex items-center gap-3">
							<div className="w-16 h-6 bg-yellow-500/30 border border-yellow-500 rounded" />
							<div className="text-zinc-700 dark:text-zinc-400">
								<span className="text-yellow-700 dark:text-yellow-300 font-semibold">1,300-2,400 ft</span> - Marginal visibility
							</div>
						</div>
						<div className="flex items-center gap-3">
							<div className="w-16 h-6 bg-orange-500/30 border border-orange-500 rounded" />
							<div className="text-zinc-700 dark:text-zinc-400">
								<span className="text-orange-700 dark:text-orange-300 font-semibold">800-1,200 ft</span> - Low visibility
							</div>
						</div>
						<div className="flex items-center gap-3">
							<div className="w-16 h-6 bg-red-500/30 border border-red-500 rounded" />
							<div className="text-zinc-700 dark:text-zinc-400">
								<span className="text-red-700 dark:text-red-300 font-semibold">&lt;800 ft</span> - Very low visibility
							</div>
						</div>
					</div>
				</div>

				<div>
					<h3 className="font-semibold text-base mb-3">Visibility Trends</h3>
					<p className="text-zinc-700 dark:text-zinc-400 mb-3">
						Animated chevron patterns show whether visibility is improving or deteriorating:
					</p>

					<div className="space-y-3">
						<div>
							<div className="text-xs text-zinc-500 uppercase tracking-wide mb-1.5">Increasing</div>
							<div className="flex gap-0.5 h-10">
								<div className="flex-1 bg-yellow-500/30 border border-yellow-500 flex items-center justify-center relative overflow-hidden">
									<div
										className="absolute inset-0 chevron-bg-increasing"
										style={{
											backgroundImage: getChevronBackground("increasing", 1800).backgroundImage,
											backgroundRepeat: "no-repeat",
											backgroundPosition: "center 0",
											backgroundSize: "100% 120px",
										}}
									/>
									<div className="text-sm font-mono font-semibold text-yellow-700 dark:text-yellow-300 relative z-10">1,800 ft</div>
								</div>
								<div className="flex-1 bg-yellow-500/30 border border-yellow-500 flex items-center justify-center relative overflow-hidden">
									<div
										className="absolute inset-0 chevron-bg-increasing"
										style={{
											backgroundImage: getChevronBackground("increasing", 2000).backgroundImage,
											backgroundRepeat: "no-repeat",
											backgroundPosition: "center 0",
											backgroundSize: "100% 120px",
										}}
									/>
									<div className="text-sm font-mono font-semibold text-yellow-700 dark:text-yellow-300 relative z-10">2,000 ft</div>
								</div>
								<div className="flex-1 bg-lime-500/30 border border-lime-500 flex items-center justify-center relative overflow-hidden">
									<div
										className="absolute inset-0 chevron-bg-increasing"
										style={{
											backgroundImage: getChevronBackground("increasing", 2600).backgroundImage,
											backgroundRepeat: "no-repeat",
											backgroundPosition: "center 0",
											backgroundSize: "100% 120px",
										}}
									/>
									<div className="text-sm font-mono font-semibold text-lime-700 dark:text-lime-300 relative z-10">2,600 ft</div>
								</div>
							</div>
							<p className="text-xs text-zinc-700 dark:text-zinc-400 mt-1.5">
								Upward chevrons indicate visibility is <span className="text-lime-700 dark:text-lime-300">improving</span> - conditions
								are getting better
							</p>
						</div>

						<div>
							<div className="text-xs text-zinc-500 uppercase tracking-wide mb-1.5">Decreasing</div>
							<div className="flex gap-0.5 h-10">
								<div className="flex-1 bg-lime-500/30 border border-lime-500 flex items-center justify-center relative overflow-hidden">
									<div
										className="absolute inset-0 chevron-bg-decreasing"
										style={{
											backgroundImage: getChevronBackground("decreasing", 3000).backgroundImage,
											backgroundRepeat: "no-repeat",
											backgroundPosition: "center -10px",
											backgroundSize: "100% 120px",
										}}
									/>
									<div className="text-sm font-mono font-semibold text-lime-700 dark:text-lime-300 relative z-10">3,000 ft</div>
								</div>
								<div className="flex-1 bg-yellow-500/30 border border-yellow-500 flex items-center justify-center relative overflow-hidden">
									<div
										className="absolute inset-0 chevron-bg-decreasing"
										style={{
											backgroundImage: getChevronBackground("decreasing", 2200).backgroundImage,
											backgroundRepeat: "no-repeat",
											backgroundPosition: "center -10px",
											backgroundSize: "100% 120px",
										}}
									/>
									<div className="text-sm font-mono font-semibold text-yellow-700 dark:text-yellow-300 relative z-10">2,200 ft</div>
								</div>
								<div className="flex-1 bg-yellow-500/30 border border-yellow-500 flex items-center justify-center relative overflow-hidden">
									<div
										className="absolute inset-0 chevron-bg-decreasing"
										style={{
											backgroundImage: getChevronBackground("decreasing", 1600).backgroundImage,
											backgroundRepeat: "no-repeat",
											backgroundPosition: "center -10px",
											backgroundSize: "100% 120px",
										}}
									/>
									<div className="text-sm font-mono font-semibold text-yellow-700 dark:text-yellow-300 relative z-10">1,600 ft</div>
								</div>
							</div>
							<p className="text-xs text-zinc-700 dark:text-zinc-400 mt-1.5">
								Downward chevrons indicate visibility is <span className="text-orange-700 dark:text-orange-300">deteriorating</span> -
								conditions are getting worse
							</p>
						</div>

						<div>
							<div className="text-xs text-zinc-500 uppercase tracking-wide mb-1.5">Steady</div>
							<div className="flex gap-0.5 h-10">
								<div className="flex-1 bg-lime-500/30 border border-lime-500 flex items-center justify-center">
									<div className="text-sm font-mono font-semibold text-lime-700 dark:text-lime-300">4,200 ft</div>
								</div>
								<div className="flex-1 bg-lime-500/30 border border-lime-500 flex items-center justify-center">
									<div className="text-sm font-mono font-semibold text-lime-700 dark:text-lime-300">4,000 ft</div>
								</div>
								<div className="flex-1 bg-lime-500/30 border border-lime-500 flex items-center justify-center">
									<div className="text-sm font-mono font-semibold text-lime-700 dark:text-lime-300">3,800 ft</div>
								</div>
							</div>
							<p className="text-xs text-zinc-700 dark:text-zinc-400 mt-1.5">
								No chevron pattern indicates visibility is <span className="text-zinc-700 dark:text-zinc-300">steady</span> -
								conditions are stable
							</p>
						</div>
					</div>
				</div>

				<div className="flex justify-end pt-2">
					<DialogClose asChild>
						<Button type="button" variant="secondary">
							Got it
						</Button>
					</DialogClose>
				</div>
			</div>
		</DialogContent>
	</Dialog>
);

const SkeletonLoader: React.FC<RunwayConditionsProps> = ({ airport }) => (
	<div className="border-b border-white/10">
		<div className="flex flex-row px-3 py-2 justify-between">
			<div className="flex flex-row space-x-2 items-center">
				<span className="text-md font-semibold pointer-events-none">
					Runway Conditions
				</span>
			</div>
			<Skeleton className="h-6 w-24" />
		</div>

		<div className="border-t divide-y divide-white/10">
			<ScrollArea className="min-h-[200px] h-[307px]">
				{Array.from({ length: airport?.runways?.length ?? 4 }).map((_, index) => (
					<div key={index} className="p-3">
						<div className="flex items-center justify-between gap-6">
							<div className="shrink-0 space-y-0.5">
								<Skeleton className="h-5 w-16" />
								<Skeleton className="h-4 w-12" />
							</div>

							<div className="shrink-0 w-80">
								<div className="space-y-1.5">
									<div className="flex gap-0.5 h-8">
										<Skeleton className="flex-1 h-full" />
										<Skeleton className="flex-1 h-full" />
										<Skeleton className="flex-1 h-full" />
									</div>

									<div className="flex text-[10px] text-zinc-500 uppercase tracking-wide">
										<div className="flex-1 text-center">Touchdown</div>
										<div className="flex-1 text-center">Midpoint</div>
										<div className="flex-1 text-center">Rollout</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				))}

				<ScrollBar orientation="vertical" />
			</ScrollArea>
		</div>
	</div>
);

const ProbeIndicator: React.FC<{ data: RvrProbe, target: RvrProbeType }> = ({ data, target }) => {
	const probe = data[target];
	if (!probe) return (
		<div className="flex-1 border flex items-center justify-center relative overflow-hidden bg-zinc-400 dark:bg-zinc-800 border-zinc-500 dark:border-zinc-700">
			<div className="text-xs font-mono font-semibold relative">
				N/A
			</div>
		</div>
	);
	
	const { animationClass, backgroundImage } = getChevronBackground(probe.trend, probe.visibilityFt);
	
	return (
		<div className={cn("flex-1 border flex items-center justify-center relative overflow-hidden", getVisibilityColor(probe.visibilityFt))}>
			{probe && probe.trend !== "steady" && (
				<div
					className={cn("absolute inset-0", animationClass)}
					style={{
						backgroundImage,
						backgroundRepeat: "no-repeat",
						backgroundPosition: "center 0",
						backgroundSize: "100% 120px",
					}}
				/>
			)}
			
			<div className="text-xs font-mono font-semibold relative">
				<span>{formatVisibility(probe.visibilityFt)}</span>
			</div>
		</div>
	)
}

export const RunwayConditions: React.FC<RunwayConditionsProps> = ({ airport }) => {
	const [rvr, setRvr] = useState<RvrResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);
	
	const refresh = () => {
		setLoading(true);
		fetchRvrForAirport(airport.iata_code!)
			.then(unwrap)
			.then(setRvr)
			.catch(err => {
				setError(err);
				toast('Error loading runway conditions', {
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
	
	const runways = useMemo(
		() => {
			if (!rvr) return [];
			return airport
				.runways
				.map(rwy => {
					const name = `${padZero(rwy.le_ident!)}/${padZero(rwy.he_ident!)}`;
					const rvrData = rvr.runways.find(r => r.name === padZero(rwy.le_ident!));
					return { ...rwy, name, rvrData };
				})
				.sort((a, b) => {
					const aHasData = a.rvrData ? 1 : 0;
					const bHasData = b.rvrData ? 1 : 0;
					if (bHasData !== aHasData) return bHasData - aHasData;
					return a.name.localeCompare(b.name);
				})
		},
		[airport.runways, rvr]
	);
	
	if (loading) return <SkeletonLoader airport={airport} />;
	if (!rvr || error) return (
		<div className="border-b border-white/10">
			<style>{chevronAnimationStyles}</style>

			<div className="flex flex-row px-3 py-2 justify-between">
				<div className="flex flex-row space-x-2 items-center">
					<span className="text-md font-semibold pointer-events-none">
						Runway Conditions
					</span>
					
					<Tutorial>
						<button className="text-muted-foreground hover:text-zinc-300 transition-colors cursor-pointer">
							<CircleHelp className="h-3.5 w-3.5" />
						</button>
					</Tutorial>
				</div>
				<Skeleton className="h-6 w-24" />
			</div>

			<div className="border-t">
				<ScrollArea className="min-h-[200px] h-[307px]">
					<ErrorSection
						title="Error loading runway conditions"
						className="border-t rounded-none border-solid"
						error={error?.message}
						refresh={refresh}
					/>
				</ScrollArea>
			</div>
		</div>
	);
	
	const updatedTime = moment(rvr.updatedAt);

	return (
		<div className="border-b border-white/10">
			<style>{chevronAnimationStyles}</style>

			<div className="flex flex-row px-3 py-2 justify-between">
				<div className="flex flex-row space-x-2 items-center">
					<span className="text-md font-semibold pointer-events-none">
						Runway Conditions
					</span>
					
					<Tutorial>
						<button className="text-muted-foreground hover:text-zinc-300 transition-colors cursor-pointer">
							<CircleHelp className="h-3.5 w-3.5" />
						</button>
					</Tutorial>
				</div>
				<Tooltip delayDuration={200}>
					<TooltipTrigger>
						<div className="flex px-2 text-sm items-center gap-2 rounded-sm bg-zinc-300 dark:bg-zinc-800 font-mono tabular-nums cursor-help">
							<Clock4 className="size-3.5" />
							<span>{updatedTime.format('h:mm A')}</span>
						</div>
					</TooltipTrigger>
					<TooltipContent align="end">
						Last updated {updatedTime.format('MMM Do, YYYY [at] h:mm A')}
					</TooltipContent>
				</Tooltip>
			</div>

			<div className="border-t divide-y divide-white/10">
				<ScrollArea className="min-h-[200px] h-[310px]">
					{runways.map(rwy => (
						<div key={rwy.name} className="p-3 not-first:border-t">
							<div className="flex items-center justify-between gap-6">
								<div className="shrink-0 space-y-0.5">
									<div className="font-mono font-semibold text-zinc-800 dark:text-white">
										{rwy.name}
									</div>
									<div className="text-xs text-zinc-400 tabular-nums">
										{rwy.length_ft!.toLocaleString()} ft
									</div>
								</div>
	
								<div className="shrink-0 w-80">
									{!rwy.rvrData && (
										<div className="text-sm text-zinc-500 text-right">
											No RVR data
										</div>
									)}
									
									{rwy.rvrData && (
										<div className="space-y-1.5">
											<div className="flex gap-0.5 h-8">
												{["touchdown", "midpoint", "rollout"].map(target => (
													<ProbeIndicator
														key={`rwy-${rwy.name}-${rwy.airport_ident}-${target}`}
														data={rwy.rvrData!}
														target={target as RvrProbeType}
													/>
												))}
											</div>
	
											<div className="flex text-[10px] text-zinc-500 uppercase tracking-wide">
												<div className="flex-1 text-center">Touchdown</div>
												<div className="flex-1 text-center">Midpoint</div>
												<div className="flex-1 text-center">Rollout</div>
											</div>
										</div>
									)}
								</div>
							</div>
						</div>
					))}
					
					<ScrollBar orientation="vertical" />
				</ScrollArea>
			</div>
		</div>
	);
}
