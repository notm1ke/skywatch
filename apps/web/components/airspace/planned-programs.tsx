import { motion } from "motion/react";
import { useAirspace } from "./provider";
import { ClockCheck } from "lucide-react";
import { useMobile } from "../mobile-provider";
import { ScrollArea } from "../ui/scroll-area";
import { ErrorSection } from "../error-section";
import { Skeleton, SkeletonWithDelay } from "../ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle
} from "../ui/empty";

export const AirspacePlannedEvents = () => {
	const { mobile } = useMobile();
	const { planned, loading, error, refresh } = useAirspace();
	
	if (loading) return (
		<div className="border-t">
			<div className="flex flex-row px-3 py-2 justify-between">
				<span className="text-md font-semibold pointer-events-none">
					Planned Interruptions
				</span>
				<div className="flex px-2 text-sm items-center rounded-sm font-mono pointer-events-none">
					<Skeleton className="h-[25px] w-10 rounded-sm" />
				</div>
			</div>
			<div className="border-t">
				<ScrollArea className="py-2 h-[173px]">
					{Array.from({ length: 6 }).map((_, i) => (
						<div key={`planned-programs-skeleton-${i}`} className="flex flex-row justify-between px-3 py-1.5">
							<div className="flex items-center gap-2">
								<SkeletonWithDelay className="h-4 w-20 rounded" delay={i * 50} />
								<SkeletonWithDelay className="h-4 w-16 rounded" delay={i * 50} />
							</div>
							<SkeletonWithDelay className="h-4 w-64 rounded" delay={i * 50} />
						</div>
					))}
				</ScrollArea>
			</div>
		</div>
	);
	
	if (error) return (
		<div className="border-t">
			<div className="flex flex-row px-3 py-2 justify-between">
				<span className="text-md font-semibold pointer-events-none">
					Planned Interruptions
				</span>
				<div className="flex px-2 text-sm items-center rounded-sm font-mono pointer-events-none">
					<Skeleton className="h-[25px] w-10 rounded-sm" />
				</div>
			</div>
			
			<ErrorSection
				title="Error loading planned interruptions"
				error={error?.message}
				refresh={refresh}
				className="border-t rounded-none border-solid"
			/>
		</div>
	);
	
	return (
		<div className="border-t">
			<div className="flex flex-row px-3 py-2 justify-between">
				<span className="text-md font-semibold pointer-events-none">
					Planned Interruptions
				</span>
				<div className="flex px-2 text-sm items-center rounded-sm bg-zinc-300 dark:bg-zinc-800 font-mono tabular-nums pointer-events-none">
					{planned.length}
				</div>
			</div>
			<div className="border-t">
				{!planned.length && (
					<Empty className="h-[176px]">
						<EmptyHeader>
							<EmptyMedia>
								<div className="bg-green-200 dark:bg-green-700 p-2 rounded-lg">
									<ClockCheck />
								</div>
							</EmptyMedia>
							<EmptyTitle>No planned interruptions</EmptyTitle>
							<EmptyDescription>
								The FAA has not posted any upcoming planned interruption advisories.
							</EmptyDescription>
						</EmptyHeader>
					</Empty>
				)}
				
				{planned.length > 0 && (
					<ScrollArea className="py-2 h-[175px]">
						{planned.map((plan, i) => (
							<motion.div
								key={`planned-${plan.iataCode}-${i}`}
								className="group flex flex-row justify-between px-3 py-1.5"
								initial={{ opacity: 0, y: -20 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -20 }}
								transition={{ delay: i * (50 / 1000) }}
							>
								<div>
									<div className="flex items-center gap-0.5">
										<Tooltip>
											<TooltipTrigger>
												<span className="text-zinc-500 font-mono tracking-tighter text-sm ligatures align-text-top">
													{plan.forecastType === 'after' ? '>=' : '<='}
													{plan.time}
												</span>
											</TooltipTrigger>
											<TooltipContent side="left">
												<div className="text-center">
													Plan in effect {plan.forecastType}
													<br />
													<span className="font-semibold font-mono tracking-tighter">{plan.time}</span>
												</div>
											</TooltipContent>
										</Tooltip>
										<span className="text-sm font-mono px-2 pointer-events-none">at {plan.iataCode.join(', ')}</span>
									</div>
								</div>
								<div className="text-sm">
									{mobile ? plan.eventType.replace("Program", "") : plan.eventType}
								</div>
							</motion.div>
						))}
					</ScrollArea>
				)}
			</div>
		</div>
	)
}