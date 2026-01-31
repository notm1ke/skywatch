import { orpc } from "~/lib/gateway";
import { motion } from "motion/react";
import { ClipboardCheck } from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";
import { ErrorSection } from "../error-section";
import { useQuery } from "@tanstack/react-query";
import { AirspaceAdvisoryDetails } from "./advisory-details";
import { Skeleton, SkeletonWithDelay } from "../ui/skeleton";

import {
	MorphingDialog,
	MorphingDialogContainer,
	MorphingDialogTrigger
} from "../ui/morphing-dialog";

import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle
} from "../ui/empty";

export const ActiveAdvisories = () => {
	const { data, isLoading, error, refetch } = useQuery(orpc.airspace.advisories.all.queryOptions());
	
	if (isLoading) return (
		<div className="border-t">
			<div className="flex flex-row px-3 py-2 justify-between border-b">
				<div className="text-md font-semibold pointer-events-none">
					Airspace Advisories
				</div>
				<div className="flex px-2 text-sm items-center rounded-sm font-mono tabular-nums">
					<Skeleton className="w-12 h-6 rounded" />
				</div>
			</div>
			<div className="border-t">
				<ScrollArea className="min-h-auto h-[246px]">
					<div className="flex flex-col divide-y">
						{Array(8).fill(null).map((_, i) => (
							<div
								key={`active-programs-skeleton-${i}`}
								className="group flex flex-row justify-between px-3 py-2.5 hover:bg-muted/30 transition-colors duration-300 ease-out"
							>
								<div className="flex items-center gap-2">
									<SkeletonWithDelay className="h-5 w-7 rounded-sm" delay={i * 50} />
									<SkeletonWithDelay className="h-5 w-18 rounded-sm" delay={i * 50} />
								</div>
								<div className="flex items-center space-x-3">
									<SkeletonWithDelay className="h-5 w-[30ch] rounded-sm" delay={i * 50} />
								</div>
							</div>
						))}
					</div>
				</ScrollArea>
			</div>
		</div>
	);
	
	if (error || !data) return (
		<div className="border-t">
			<div className="flex flex-row px-3 py-2 justify-between">
				<div className="text-md font-semibold pointer-events-none">
					Airspace Advisories
				</div>
				<div className="flex px-2 text-sm items-center rounded-sm font-mono tabular-nums">
					<Skeleton className="w-12 h-6 rounded" />
				</div>
			</div>
			<ErrorSection
				title="Error loading airspace advisories"
				className="border-t rounded-none border-solid"
				error={error?.message}
				refresh={refetch}
			/>
		</div>
	);

	return (
		<div className="border-t">
			<div className="flex flex-row px-3 py-2 justify-between">
				<span className="text-md font-semibold pointer-events-none">
					Airspace Advisories
				</span>
				<div className="flex px-2 text-sm items-center rounded-sm bg-zinc-300 dark:bg-zinc-800 font-mono tabular-nums pointer-events-none">
					{data.length}
				</div>
			</div>
			<div className="border-t">
				{!data.length && (
					<Empty>
						<EmptyHeader>
							<EmptyMedia>
								<div className="bg-green-200 dark:bg-green-700 p-2 rounded-lg">
									<ClipboardCheck />
								</div>
							</EmptyMedia>
							<EmptyTitle>No published advisories</EmptyTitle>
							<EmptyDescription>
								The FAA has not posted any advisories.
							</EmptyDescription>
						</EmptyHeader>
					</Empty>
				)}

				{data.length > 0 && (
					<ScrollArea className="h-[246px]">
						<div className="flex flex-col divide-y">
							{data
								.sort((a, b) => a.advisoryNumber - b.advisoryNumber)
								.map((advisory, i) => (
									<MorphingDialog key={`advisory-${advisory.advisoryNumber}`}>
										<MorphingDialogTrigger>
											<motion.div
												className="group flex flex-row justify-between px-3 py-2.5 hover:bg-muted/30 transition-colors duration-300 ease-out"
												initial={{ opacity: 0, y: -20 }}
												animate={{ opacity: 1, y: 0 }}
												exit={{ opacity: 0, y: -20 }}
												transition={{ delay: i * (50 / 1000) }}
											>
												<div className="flex items-center gap-0.5">
													<span className="text-zinc-500 font-mono tracking-tighter text-sm ligatures align-text-top">
														#{advisory.advisoryNumber}
													</span>
													<span className="text-sm font-mono px-2 pointer-events-none">{advisory.facilities.join(", ")}</span>
												</div>
												<div className="text-sm max-w-[40ch] truncate">
													{advisory.brief.replaceAll("_", " ")}
												</div>
											</motion.div>
										</MorphingDialogTrigger>
										<MorphingDialogContainer>
											<AirspaceAdvisoryDetails advisory={advisory} />
										</MorphingDialogContainer>
									</MorphingDialog>
								)
							)}
						</div>
					</ScrollArea>
				)}
			</div>
		</div>
	)
}
