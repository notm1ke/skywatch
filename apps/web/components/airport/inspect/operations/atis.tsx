import { z } from "zod/v4";
import { orpc } from "~/lib/gateway";
import { Check, Maximize } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "~/components/ui/skeleton";
import { ErrorSection } from "~/components/error-section";
import { capitalizeFirst, cn, formatFaaTime } from "~/lib/utils";
import { ScrollArea, ScrollBar } from "~/components/ui/scroll-area";
import { PropsWithChildren, useEffect, useMemo, useState } from "react";
import { AnnotatedAtisSegment, parseAtisText } from "~/lib/aviation/atis";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
import { AirportAtis, AirportAtisType, AirportWithJoins } from "@skywatch/gateway/schemas";

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from "~/components/ui/dialog";

export const AtisBroadcastSkeletonLoader = () => (
	<div className="border-b border-border">
		<div className="flex flex-row px-3 py-2 justify-between">
			<div className="flex flex-row space-x-2 items-center">
				<Skeleton className="h-5 w-12" />
			</div>
			<div className="flex flex-row space-x-1">
				<Skeleton className="h-6 w-6 rounded" />
				<Skeleton className="h-5 w-16 rounded-sm" />
			</div>
		</div>

		<div className="border-t divide-y divide-white/10">
			<div className="p-3">
				<div className="h-[264px] space-y-2">
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-[90%]" />
					<Skeleton className="h-4 w-[95%]" />
					<Skeleton className="h-4 w-[85%]" />
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-[80%]" />
					<Skeleton className="h-4 w-[92%]" />
					<Skeleton className="h-4 w-[88%]" />
					<Skeleton className="h-4 w-[75%]" />
					<Skeleton className="h-4 w-[60%]" />
				</div>
			</div>
		</div>
	</div>
)

const renderSegment = (segment: AnnotatedAtisSegment, line: number, fragment: number) => {
	if (!segment.tooltip) return (
		<span key={`raw-${line}-${fragment}`}>{segment.text}</span>
	);
	
	return (
		<Tooltip key={`rich-${line}-${fragment}`} delayDuration={200}>
			<TooltipTrigger asChild>
				<span className={cn("underline decoration-dotted cursor-help transition-colors", segment.color)}>
					{segment.text}
				</span>
			</TooltipTrigger>
			<TooltipContent side="top">
				<div className="space-y-1.5 w-48">
					<div className="font-semibold text-sm">{segment.tooltip.title}</div>
					<div className="text-xs leading-relaxed w-full">{segment.tooltip.description}</div>
					{segment.tooltip.detail && (
						<div className="text-xs text-blue-400 font-mono pt-1 border-t border-border">
							{segment.tooltip.detail}
						</div>
					)}
				</div>
			</TooltipContent>
		</Tooltip>
	)
}

const atisBody = (active: z.infer<typeof AirportAtis> | undefined) => (
	<div
		key={active?.type}
		className="animate-in fade-in duration-200"
	>
		<pre className="text-xs font-mono text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
			{!active && "ATIS is not supported for this airport"}
			{active && active.atis.split(".").map((line, lineIdx) => {
				const trimmed = line.trim();
				if (!trimmed) return null;
				const segments = parseAtisText(trimmed + ".");
				return (
					<div key={`line-${lineIdx}`} className="mb-1">
						{segments.map((segment, fragmentIdx) => renderSegment(segment, lineIdx, fragmentIdx))}
					</div>
				);
			})}
		</pre>
	</div>
);

const FullScreen: React.FC<PropsWithChildren<{ active?: z.infer<typeof AirportAtis> }>> = ({ active, children }) => (
	<Dialog>
		<DialogTrigger asChild>
			{children}
		</DialogTrigger>
		<DialogContent>
			<DialogHeader>
				<DialogTitle>
					ATIS Broadcast
				</DialogTitle>
				<DialogDescription>
					{active && (
						<>
							{capitalizeFirst(active.type)} broadcast, transmitted at {formatFaaTime(active.time).toUpperCase()} (UTC)
						</>
					)}
					
					{!active && (
						<>Please select an ATIS type to proceed.</>
					)}
				</DialogDescription>
			</DialogHeader>
			{atisBody(active)}
		</DialogContent>
	</Dialog>
)

export const AtisBroadcast: React.FC<{ airport: AirportWithJoins }> = ({ airport }) => {
	const { data: atis, isLoading, error, refetch } = useQuery(orpc.airports.atis.queryOptions({
		input: { iata_code: airport.iata_code! },
		queryKey: ["atis", airport.iata_code]
	}));
	
	const [selected, setSelected] = useState<z.infer<typeof AirportAtisType>>();
	
	useEffect(() => {
		if (!isLoading && atis?.length) {
			setSelected(atis[0].type);
		}
	}, [atis, isLoading]);
	
	const types = useMemo(
		() => [...new Set(atis?.map(atis => atis.type))],
		[atis]
	);
	
	const active = useMemo(
		() => atis?.find(atis => atis.type === selected),
		[atis, selected]
	);
	
	if (isLoading) return <AtisBroadcastSkeletonLoader />;
	if (!atis || error) return (
		<div className="border-b border-border">
			<div className="flex flex-row px-3 py-2 justify-between">
				<div className="flex flex-row space-x-2 items-center">
					<span className="text-md font-semibold pointer-events-none">
						ATIS
					</span>
				</div>
			</div>

			<div className="border-t">
				<ErrorSection
					title="Error loading ATIS information"
					className="border-t rounded-none border-solid h-[288px]"
					error={error?.message}
					refresh={refetch}
				/>
			</div>
		</div>
	);
	
	return (
		<div>
			{/*<div className="flex flex-row px-3 py-[6px] justify-between">
				<div className="flex flex-row space-x-2 items-center">
					<span className="text-md font-semibold pointer-events-none">
						ATIS
					</span>
				</div>
				<div className="flex flex-row">
					{active && (
						<div>
							<FullScreen active={active}>
								<Button
									variant="ghost"
									size="sm"
									className="h-6 w-6 p-0 hover:bg-black/10 dark:hover:bg-white/10 text-black/60 dark:text-white/60 hover:text-black/90 dark:hover:text-white/90 cursor-pointer"
								>
									<Maximize className="h-3.5 w-3.5" />
								</Button>
							</FullScreen>
						</div>
					)}
					
					{types.length > 1 && (
						<div className="space-x-1">
							{types.map(type => (
								<Button
									key={type}
									variant="outline"
									className="rounded-sm h-5"
									onClick={() => setSelected(type)}
								>
									{capitalizeFirst(type)}
									{selected === type && <Check />}
								</Button>
							))}
						</div>
					)}
				</div>
			</div>*/}
			
			<div className="flex flex-row px-3 py-2 justify-between">
				<div className="flex flex-row space-x-2 items-center">
					<span className="text-md font-semibold pointer-events-none">
						ATIS
					</span>
				</div>
				<FullScreen active={active}>
					<Button
						variant="ghost"
						size="sm"
						className="h-6 w-6 p-0 hover:bg-black/10 dark:hover:bg-white/10 text-black/60 dark:text-white/60 hover:text-black/90 dark:hover:text-white/90 cursor-pointer"
					>
						<Maximize className="h-3.5 w-3.5" />
					</Button>
				</FullScreen>
			</div>

			<div className="border-t divide-y divide-white/10">
				<div className="p-3">
					<ScrollArea className="h-[264px]">
						{atisBody(active)}
						<ScrollBar orientation="vertical" />
					</ScrollArea>
				</div>
			</div>
		</div>
	)
}