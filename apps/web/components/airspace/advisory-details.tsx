import { z } from "zod/v4";
import { cn } from "cnfast";
import { useState } from "react";
import { orpc } from "~/lib/gateway";
import { motion } from "motion/react";
import { ScrollArea } from "../ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { SkeletonWithDelay } from "../ui/skeleton";
import { AirspaceAdvisory } from "@skywatch/gateway/schemas";
import { ClipboardX, LinkIcon, Maximize, Minimize, XIcon } from "lucide-react";
import { MorphingDialogContent, useMorphingDialog } from "../ui/morphing-dialog";

import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle
} from "../ui/empty";

export const AirspaceAdvisoryDetails: React.FC<{ advisory: z.infer<typeof AirspaceAdvisory> }> = ({ advisory }) => {
	const [expanded, setExpanded] = useState(false);
	
	const { setIsOpen } = useMorphingDialog();
	const { data, isLoading, error } = useQuery(orpc.airspace.advisories.details.queryOptions({
		input: { advisoryNumber: advisory.advisoryNumber }
	}));
	
	return (
		<MorphingDialogContent className="bg-background border border-border rounded-xl">
			<motion.div layout className={cn(
				"flex flex-col space-y-2 divide-y",
				expanded
					? "sm:min-w-5xl sm:max-w-5xl"
					: "sm:min-w-xl sm:max-w-2xl"
			)}>
				<div className="bg-zinc-50 dark:bg-zinc-900 px-4 py-2.5 flex flex-row items-center justify-between">
					<h2 className="font-medium">Advisory #{advisory.advisoryNumber}</h2>
					<div className="flex flex-row space-x-4 items-center">
						<button className="hidden sm:flex cursor-pointer" onClick={() => setExpanded(!expanded)}>
							{expanded
								? <Minimize className="size-4 text-zinc-700 dark:text-zinc-300" />
								: <Maximize className="size-4 text-zinc-700 dark:text-zinc-300" />}
						</button>
					
						<a
							href={advisory.advisoryUrl}
							target="_blank"
							rel="noopener noreferrer"
						>
							<LinkIcon className="size-4 text-zinc-700 dark:text-zinc-300" />
						</a>
					
						<button className="cursor-pointer" onClick={() => setIsOpen(false)}>
							<XIcon className="size-4.5 text-zinc-700 dark:text-zinc-300 cursor-pointer" />
						</button>
					</div>
				</div>
				
				{isLoading && (
					<div className="px-3 py-2 h-[500px] flex flex-col space-y-2">
						{Array.from({ length: 20 }).map((_, i) => (
							<SkeletonWithDelay
								className="h-4 rounded"
								style={{ width: Math.random() * 500 + 50 }}
								key={`airspace-advisory-details-${advisory.advisoryNumber}-line-${i + 1}`}
								delay={i * 50}
							/>
						))}
					</div>
				)}
				
				{!isLoading && (error || !data) && (
					<Empty>
						<EmptyHeader>
							<EmptyMedia>
								<div className="bg-red-200 dark:bg-red-700 p-2 rounded-lg">
									<ClipboardX />
								</div>
							</EmptyMedia>
							<EmptyTitle>Error retrieving advisory</EmptyTitle>
							<EmptyDescription>
								Something went wrong while retrieving the advisory details.
							</EmptyDescription>
						</EmptyHeader>
					</Empty>
				)}
				
				{data && (
					<ScrollArea className={cn(expanded ? "h-[650px]" : "h-[500px]")}>
						<pre className="px-3 py-2 whitespace-pre-wrap text-sm sm:max-w-[71ch] wrap-break-word">
							{advisory.brief.replaceAll("_", " ")}{"\n"}
							____________________________________________________________________{"\n\n"}
							{data
								.replace(/\\\\/gi, "")
								.replace(/\\n/gi, "\n")
								.replace(/\\t/gi, "\t")
								.replaceAll("&nbsp;", " ")
								.replaceAll("\"", "")
								.trim()}
						</pre>
					</ScrollArea>
				)}
			</motion.div>
		</MorphingDialogContent>
	)
}