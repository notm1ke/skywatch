import { toast } from "sonner";
import { Check } from "lucide-react";
import { unwrap } from "~/lib/actions";
import { capitalizeFirst, cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { useEffect, useMemo, useState } from "react";
import { AnnotatedAtisSegment, parseAtisText } from "~/lib/atis";
import { ScrollArea, ScrollBar } from "~/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";

import {
	AirportWithJoins,
	AtisResponse,
	AtisType,
	fetchAtisForIata
} from "~/lib/airports";

const renderSegment = (segment: AnnotatedAtisSegment, line: number, fragment: number) => {
	if (!segment.tooltip) return (
		<span key={`raw-${line}-${fragment}`}>{segment.text}</span>
	)
	
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

export const AtisBroadcast: React.FC<{ airport: AirportWithJoins }> = ({ airport }) => {
	const [atis, setAtis] = useState<AtisResponse[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);
	
	const [selected, setSelected] = useState<AtisType>();
	
	const refresh = () => {
		setLoading(true);
		fetchAtisForIata(airport.iata_code!)
			.then(unwrap)
			.then(atis => {
				setAtis(atis);
				setSelected(atis.at(0)?.type);
			})
			.catch(err => {
				setError(err);
				toast("Error fetching ATIS:", {
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
	
	const types = useMemo(
		() => [...new Set(atis.map(atis => atis.type))],
		[atis]
	);
	
	const active = useMemo(
		() => atis.find(atis => atis.type === selected),
		[atis, selected]
	)
	
	if (loading) return <>loading</>;
	if (!atis || error) return <>loading</>;
	
	return (
		<div className="border-b border-border">
			<div className="flex flex-row px-3 py-2 justify-between">
				<div className="flex flex-row space-x-2 items-center">
					<span className="text-md font-semibold pointer-events-none">
						ATIS
					</span>
				</div>
				<div className="space-x-1">
					{types.length > 1 && types.map(type => (
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
			</div>

			<div className="border-t divide-y divide-white/10">
				<div className="p-3">
					<ScrollArea className="h-[235px]">
						<div
							key={active?.type}
							className="animate-in fade-in duration-200"
						>
							{active && (
								<pre className="text-xs font-mono text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
									{active.atis.split(".").map((line, lineIdx) => {
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
							)}
						</div>
						<ScrollBar orientation="vertical" />
					</ScrollArea>
				</div>
			</div>
		</div>
	)
}