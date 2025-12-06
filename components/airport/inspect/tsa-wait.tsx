import moment from "moment-timezone";

import { toast } from "sonner";
import { motion } from "motion/react";
import { unwrap } from "~/lib/actions";
import { AirportWithJoins } from "~/lib/airports";
import { useDebounce } from "~/hooks/use-debounce";
import { Skeleton } from "~/components/ui/skeleton";
import { ClearIcon } from "~/components/icons/clear";
import { PrecheckIcon } from "~/components/icons/precheck";
import { SlidingNumber } from "~/components/ui/sliding-number";
import { fetchWaitTimes, TsaWaitTimesResponse } from "~/lib/tsa";
import { PropsWithChildren, ReactNode, useEffect, useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";

type TsaWaitTimesProps = {
	airport: AirportWithJoins;
};

const getColor = (waitTime: number) => {
	if (waitTime === 0) return "rgba(82, 82, 91, 0.1)";
	if (waitTime <= 5) return `rgba(34, 197, 94, ${0.3 + (waitTime / 5) * 0.4})`;
	if (waitTime <= 10) return `rgba(234, 179, 8, ${0.3 + ((waitTime - 5) / 5) * 0.4})`;
	if (waitTime <= 15) return `rgba(249, 115, 22, ${0.3 + ((waitTime - 10) / 5) * 0.4})`;
	return `rgba(239, 68, 68, ${0.3 + Math.min((waitTime - 15) / 10, 1) * 0.4})`;
}

const SecurityIcon: React.FC<PropsWithChildren<{ tooltip: ReactNode }>> = ({ children, tooltip }) => (
	<Tooltip>
		<TooltipTrigger className="cursor-help">
			{children}
		</TooltipTrigger>
		<TooltipContent className="max-w-48 wrap-break-word" side="bottom" align="end">
			{tooltip}
		</TooltipContent>
	</Tooltip>
)

export const TsaWaitTimesSkeletonLoader: React.FC<{ airport?: AirportWithJoins }> = ({ airport }) => (
	<div className="border-b border-white/10">
		<div className="flex flex-row px-3 py-2 justify-between">
			<div className="flex flex-row space-x-2 items-center">
				<span className="text-md font-semibold pointer-events-none">
					TSA Wait Times
				</span>
			</div>
			
			{!airport && (
				<div className="flex flex-row items-center space-x-1">
					<Skeleton className="aspect-square w-8 h-6 rounded-sm cursor-pointer border border-zinc-800" />
					<Skeleton className="aspect-square w-8 h-6 rounded-sm cursor-pointer border border-zinc-800" />
				</div>
			)}
			
			{(airport?.supports_precheck || airport?.supports_clear) && (
				<div className="flex flex-row items-center space-x-1">
					{airport?.supports_precheck && (
						<SecurityIcon
							tooltip={(
								<>
									<span className="font-bold">{airport?.iata_code}</span>{" "}
									has TSA PreCheck® lanes at it&apos;s checkpoints.
								</>
							)}
						>
							<PrecheckIcon className="w-10 h-4" />
						</SecurityIcon>
					)}
					
					{airport?.supports_clear && (
						<SecurityIcon
							tooltip={(
								<>
									<span className="font-bold">{airport?.iata_code}</span>{" "}
									has Clear+ lanes at certain TSA checkpoints, verify using airport signage.
								</>
							)}
						>
							<ClearIcon className="fill-[#041A55] dark:fill-white size-4" />
						</SecurityIcon>
					)}
				</div>
			)}
		</div>
		<div className="p-3 border-t border-zinc-200 dark:border-zinc-800">
			<div className="mb-4">
				<div className="text-xs text-zinc-400 dark:text-zinc-500 mb-1">Wait Time</div>
				<div className="flex flex-row space-x-1 items-center text-2xl font-bold tabular-nums text-zinc-900 dark:text-white">
					<Skeleton className="w-12 h-8" />
				</div>
				<div className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
					<Skeleton className="w-20 h-4" />
				</div>
			</div>

			<div className="space-y-2">
				<div className="grid grid-cols-12 gap-1 text-[10px] text-zinc-400 dark:text-zinc-500">
					<span>12a</span>
					<span />
					<span>2a</span>
					<span />
					<span>4a</span>
					<span />
					<span>6a</span>
					<span />
					<span>8a</span>
					<span />
					<span>10a</span>
					<span />
				</div>

				<div className="grid grid-cols-12 gap-1">
					{Array.from({ length: 12 }).map((_, index) => (
						<Skeleton key={`am-${index}`} className="aspect-square size-10 rounded-sm cursor-pointer border border-zinc-200 dark:border-zinc-800" />
					))}
				</div>

				<div className="grid grid-cols-12 gap-1 text-[10px] text-zinc-400 dark:text-zinc-500">
					<span>12p</span>
					<span />
					<span>2p</span>
					<span />
					<span>4p</span>
					<span />
					<span>6p</span>
					<span />
					<span>8p</span>
					<span />
					<span>10p</span>
					<span />
				</div>

				<div className="grid grid-cols-12 gap-1">
					{Array.from({ length: 12 }).map((_, index) => (
						<Skeleton key={`pm-${index}`} className="aspect-square size-10 rounded-sm cursor-pointer border border-zinc-200 dark:border-zinc-800" />
					))}
				</div>

				<div className="flex items-center justify-end text-xs text-zinc-400 dark:text-zinc-500 mt-4 space-x-3">
					<span>Less</span>
					<div className="flex gap-0.5">
						{[0, 5, 10, 15, 20].map(waitTime => (
							<div
							key={`tsa-wait-legend-${waitTime}`}
							className="w-3 h-3 rounded-sm border border-zinc-200 dark:border-zinc-800"
							style={{ backgroundColor: getColor(waitTime) }}
							/>
						))}
					</div>
					<span>More</span>
				</div>
			</div>
		</div>
	</div>
)

export const TsaWaitTimes: React.FC<TsaWaitTimesProps> = ({ airport }) => {
	const [waitTimes, setWaitTimes] = useState<TsaWaitTimesResponse | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<Error | null>(null);
	
	const [hoveredCell, setHoveredCell] = useState<number | null>(null);
	const debouncedHoverCell = useDebounce(hoveredCell, 250);
	
	const refresh = () => {
		setLoading(true);
		fetchWaitTimes(airport.iata_code!)
			.then(unwrap)
			.then(setWaitTimes)
			.catch(err => {
				setError(err);
				toast("Error loading TSA wait times:", {
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
	
	if (loading) return <TsaWaitTimesSkeletonLoader airport={airport} />;
	if (!waitTimes || error) return <>error</>;

	const day = moment().format('dddd');
	const hourlyData = Array.from({ length: 24 }, (_, i) => {
		const found = waitTimes.data.find((d) => Number.parseInt(d.hour) === i && d.day === day);
		return {
			hour: i,
			waitTime: found ? Number.parseInt(found.max_standard_wait) : 0,
		};
	});

	const currentHour = new Date().getHours();
	const currentHourData = hourlyData[currentHour];

	const localizeHour = (hour: number) => {
		if ((!hour && hour !== 0) || Number.isNaN(hour)) return "unavailable";
		const hr = hour === 0 ? 12 : hour >= 13 ? hour - 12 : hour;
		return `${hr}:00 ${hour < 12 ? "AM" : "PM"}`;
	};

	const displayedWaitTime =
		debouncedHoverCell !== null
			? hourlyData[debouncedHoverCell].waitTime
			: currentHourData.waitTime;

	return (
		<div className="border-b border-zinc-200 dark:border-white/10">
			<div className="flex flex-row px-3 py-2 justify-between">
				<div className="flex flex-row space-x-2 items-center">
					<span className="text-md font-semibold pointer-events-none">
						TSA Wait Times
					</span>
				</div>

				{(airport.supports_precheck || airport.supports_clear) && (
					<div className="flex flex-row items-center space-x-1">
						{airport.supports_precheck && (
							<SecurityIcon
								tooltip={(
									<>
										{airport.iata_code} has TSA PreCheck® lanes at it&apos;s checkpoints.
									</>
								)}
							>
								<PrecheckIcon className="w-10 h-4" />
							</SecurityIcon>
						)}

						{airport.supports_clear && (
							<SecurityIcon
								tooltip={(
									<>
										{airport.iata_code} has Clear+ lanes at certain TSA checkpoints, verify using airport signage.
									</>
								)}
							>
								<ClearIcon className="fill-[#041A55] dark:fill-white size-4" />
							</SecurityIcon>
						)}
					</div>
				)}
			</div>

			<div className="p-3 border-t border-zinc-200 dark:border-zinc-800">
				<div className="mb-4">
					<div className="text-xs text-zinc-400 dark:text-zinc-500 mb-1">Wait Time</div>
					<div className="flex flex-row items-center text-2xl font-bold tabular-nums text-zinc-900 dark:text-white">
						<motion.div
							layout
							className="flex flex-row items-center"
							transition={{ duration: 0.2 }}
						>
							<SlidingNumber value={displayedWaitTime} />
						</motion.div>
						<motion.span
							layout
							transition={{ duration: 0.2 }}
							className="ml-1"
						>
							min
						</motion.span>
					</div>
					<div className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
						{debouncedHoverCell !== null
							? `at ${localizeHour(hourlyData[debouncedHoverCell].hour)}`
							: "Estimated wait right now"}
					</div>
				</div>

				<div className="space-y-2">
					<div className="grid grid-cols-12 gap-1 text-[10px] text-zinc-400 dark:text-zinc-500">
						<span>12a</span>
						<span />
						<span>2a</span>
						<span />
						<span>4a</span>
						<span />
						<span>6a</span>
						<span />
						<span>8a</span>
						<span />
						<span>10a</span>
						<span />
					</div>

					<div className="grid grid-cols-12 gap-1">
						{hourlyData.slice(0, 12).map((item, index) => (
							<motion.div
								key={`am-${index}`}
								className="aspect-square rounded-sm cursor-pointer border border-zinc-200 dark:border-zinc-800"
								style={{ backgroundColor: getColor(item.waitTime) }}
								onMouseEnter={() => setHoveredCell(index)}
								onMouseLeave={() => setHoveredCell(null)}
								whileHover={{ scale: 1.1 }}
								transition={{ duration: 0.2 }}
								title={`${localizeHour(item.hour)}: ${item.waitTime} min wait`}
							/>
						))}
					</div>

					<div className="grid grid-cols-12 gap-1 text-[10px] text-zinc-400 dark:text-zinc-500">
						<span>12p</span>
						<span />
						<span>2p</span>
						<span />
						<span>4p</span>
						<span />
						<span>6p</span>
						<span />
						<span>8p</span>
						<span />
						<span>10p</span>
						<span />
					</div>

					<div className="grid grid-cols-12 gap-1">
						{hourlyData.slice(12, 24).map((item, index) => (
							<motion.div
								key={`pm-${index}`}
								className="aspect-square rounded-sm cursor-pointer border border-zinc-200 dark:border-zinc-800"
								style={{ backgroundColor: getColor(item.waitTime) }}
								onMouseEnter={() => setHoveredCell(index + 12)}
								onMouseLeave={() => setHoveredCell(null)}
								whileHover={{ scale: 1.1 }}
								transition={{ duration: 0.2 }}
								title={`${localizeHour(item.hour)}: ${item.waitTime} min wait`}
							/>
						))}
					</div>

					<div className="flex items-center justify-end text-xs text-zinc-400 dark:text-zinc-500 mt-4 space-x-3">
						<span>Less</span>
						<div className="flex gap-0.5">
							{[0, 5, 10, 15, 20].map(waitTime => (
								<div
									key={`tsa-wait-legend-${waitTime}`}
									className="w-3 h-3 rounded-sm border border-zinc-200 dark:border-zinc-800"
									style={{ backgroundColor: getColor(waitTime) }}
								/>
							))}
						</div>
						<span>More</span>
					</div>
				</div>
			</div>
		</div>
	);
};
