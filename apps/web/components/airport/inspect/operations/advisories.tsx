import { orpc } from "~/lib/gateway";
import { motion } from "motion/react";
import { ClipboardCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ScrollArea } from "~/components/ui/scroll-area";
import { ErrorSection } from "~/components/error-section";
import { AirportWithJoins } from "@skywatch/gateway/schemas";
import { SkeletonWithDelay } from "~/components/ui/skeleton";
import { AirspaceAdvisoryDetails } from "~/components/airspace/advisory-details";

import {
	MorphingDialog,
	MorphingDialogContainer,
	MorphingDialogTrigger
} from "~/components/ui/morphing-dialog";

import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle
} from "~/components/ui/empty";

type AirportAdvisoriesProps = {
	airport: AirportWithJoins;
}

export const AirportAdvisoriesSkeletonLoader = () => (
	<div className="border-r border-border">
		<div className="flex flex-row px-3 py-2 justify-between">
			<div className="flex fle-row space-x-2 items-center">
				<span className="text-md font-semibold pointer-events-none">
					Related Advisories
				</span>
			</div>
		</div>
		
		<div className="border-t">
			<ScrollArea className="min-h-auto h-[288px]">
				<div className="flex flex-col divide-y">
					{Array(7).fill(null).map((_, i) => (
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
)

export const AirportAdvisories: React.FC<AirportAdvisoriesProps> = ({ airport }) => {
	const { data, isLoading, error, refetch } = useQuery(orpc.airspace.advisories.airportRelated.queryOptions({
		input: { iata_code: airport.iata_code }
	}));
	
	if (isLoading) return <AirportAdvisoriesSkeletonLoader />;
	
	if (!data || error) return (
		<div className="border-r border-border">
			<div className="flex flex-row px-3 py-2 justify-between">
				<div className="flex fle-row space-x-2 items-center">
					<span className="text-md font-semibold pointer-events-none">
						Related Advisories
					</span>
				</div>
			</div>
			
			<div className="border-t">
				<ErrorSection
					title="Error loading related airspace advisories"
					className="border-t rounded-none border-solid h-[288px]"
					error={error?.message}
					refresh={refetch}
				/>
			</div>
		</div>
	);
	
	return (
		<div className="border-r border-border">
			<div className="flex flex-row px-3 py-2 justify-between">
				<div className="flex flex-row space-x-2 items-center">
					<span className="text-md font-semibold pointer-events-none">
						Related Advisories
					</span>
				</div>
			</div>

			<div className="border-t">
				{!data.length && (
					<Empty className="h-[288px]">
						<EmptyHeader>
							<EmptyMedia>
								<div className="bg-green-200 dark:bg-green-700 p-2 rounded-lg">
									<ClipboardCheck />
								</div>
							</EmptyMedia>
							<EmptyTitle>No related advisories</EmptyTitle>
							<EmptyDescription>
								There are no related airspace advisories for this airport.
							</EmptyDescription>
						</EmptyHeader>
					</Empty>
				)}
				
				{data.length > 0 && (
					<ScrollArea className="h-[288px]">
						<div className="flex flex-col divide-y">
							{data.sort((a, b) => a.advisoryNumber - b.advisoryNumber).map((advisory, i) => (
								<MorphingDialog key={`advisory-${advisory.advisoryNumber}`}>
									<MorphingDialogTrigger>
										<motion.div
											key={`airport-advisory-${advisory.advisoryNumber}`}
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
							))}
						</div>
					</ScrollArea>
				)}
			</div>
		</div>
	)
}