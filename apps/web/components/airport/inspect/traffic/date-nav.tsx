"use client";

import { Button } from "~/components/ui/button";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDay, TrafficSummary } from "./shared";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from "~/components/ui/dropdown-menu";

type Props = {
	summary: TrafficSummary | undefined;
	/** The day being shown while `summary` is still loading (undefined = latest). */
	requested: string | undefined;
	onSelect: (date: string | undefined) => void;
};

/** ‹ day › navigator over the days we hold for this airport. Days are Zulu days. */
export const DateNav: React.FC<Props> = ({ summary, requested, onSelect }) => {
	const days = summary?.availableDays ?? [];
	const current = summary?.date ?? requested;
	const index = days.findIndex(day => day.date === current);
	const prev = index > 0 ? days[index - 1] : undefined;
	const next = index >= 0 && index < days.length - 1 ? days[index + 1] : undefined;
	const latest = days.at(-1)?.date;
	const partial = summary ? summary.bucketCount < summary.expectedBuckets * 0.85 : false;

	return (
		<div className="flex flex-row flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
			<div className="flex items-center gap-1">
				<Button variant="ghost" size="icon-sm" disabled={!prev} onClick={() => prev && onSelect(prev.date)} aria-label="Previous day">
					<ChevronLeft />
				</Button>

				<DropdownMenu>
					<DropdownMenuTrigger disabled={!days.length} className="disabled:cursor-not-allowed">
						<div className="flex flex-row items-center gap-1 rounded-md pl-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors duration-250">
							<span className="text-md font-semibold">{current ? formatDay(current) : "Loading…"}</span>
							<ChevronDown className="size-5 text-zinc-400 dark:text-zinc-500" />
						</div>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
						{[...days].reverse().map(day => (
							<DropdownMenuItem key={day.date} onClick={() => onSelect(day.date === latest ? undefined : day.date)}>
								<span className="font-mono">{formatDay(day.date)}</span>
								{day.buckets < (summary?.expectedBuckets ?? 0) * 0.85 && (
									<span className="ml-auto pl-3 text-xs text-muted-foreground">partial</span>
								)}
							</DropdownMenuItem>
						))}
					</DropdownMenuContent>
				</DropdownMenu>

				<Button variant="ghost" size="icon-sm" disabled={!next} onClick={() => next && onSelect(next.date === latest ? undefined : next.date)} aria-label="Next day">
					<ChevronRight />
				</Button>

				{latest && current !== latest && (
					<Button variant="outline" size="xs" onClick={() => onSelect(undefined)}>Latest</Button>
				)}
			</div>

			<div className="flex items-center gap-2 text-xs text-muted-foreground">
				{partial && summary && (
					<span className="rounded-sm bg-yellow-200 px-1.5 py-0.5 text-yellow-900 dark:bg-yellow-900/60 dark:text-yellow-200">
						Partial day · {summary.bucketCount} of {summary.expectedBuckets} buckets
					</span>
				)}
				<span>Times in Zulu (UTC) · FAA scheduled arrivals</span>
			</div>
		</div>
	);
};
