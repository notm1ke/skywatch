"use client";

import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { AirportWithJoins } from "@skywatch/gateway/schemas";
import { AirportAdvisory } from "~/lib/schemas";
import { AirportRow } from "./airport-row";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "~/components/ui/empty";
import { Search } from "lucide-react";
import { useAirportFilters, AirportSortBy } from "./store";

export const AirportList = ({
	airports,
	advisoryMap,
	total,
}: {
	airports: AirportWithJoins[];
	advisoryMap: Map<string, AirportAdvisory>;
	total: number;
}) => {
	const scrollRef = useRef<HTMLDivElement>(null);
	const { sortBy, filter } = useAirportFilters();

	const virtualizer = useVirtualizer({
		count: airports.length,
		getScrollElement: () => scrollRef.current,
		estimateSize: () => 41,
		overscan: 10,
	});

	return (
		<div className="flex flex-1 flex-col overflow-hidden">
			<div className="flex items-center justify-between border-b px-4 py-2">
				<span className="text-xs text-muted-foreground tabular-nums">
					{airports.length !== total
						? `${airports.length.toLocaleString()} of ${total.toLocaleString()} airports`
						: `${total.toLocaleString()} airports`}
				</span>
				<Select value={sortBy} onValueChange={(v) => filter({ sortBy: v as AirportSortBy })}>
					<SelectTrigger size="xs" className="w-auto gap-1.5 border-none shadow-none text-xs text-muted-foreground">
						<SelectValue />
					</SelectTrigger>
					<SelectContent align="end">
						<SelectItem value="iata">A–Z by IATA code</SelectItem>
						<SelectItem value="name">A–Z by airport name</SelectItem>
						<SelectItem value="city">A–Z by city name</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{airports.length === 0 ? (
				<div className="flex flex-1 items-center justify-center">
					<Empty>
						<EmptyHeader>
							<EmptyMedia>
								<div className="rounded-lg bg-muted px-2 py-2">
									<Search className="size-6 text-muted-foreground" />
								</div>
							</EmptyMedia>
							<EmptyTitle>No airports found</EmptyTitle>
							<EmptyDescription>Try adjusting your filters or search term.</EmptyDescription>
						</EmptyHeader>
					</Empty>
				</div>
			) : (
				<div
					ref={scrollRef}
					className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-transparent [&::-webkit-scrollbar-thumb]:[background-clip:padding-box]"
				>
					<div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
						{virtualizer.getVirtualItems().map((vItem) => {
							const airport = airports[vItem.index]!;
							return (
								<div
									key={airport.iata_code}
									data-index={vItem.index}
									ref={virtualizer.measureElement}
									style={{
										position: "absolute",
										top: 0,
										left: 0,
										right: 0,
										transform: `translateY(${vItem.start}px)`,
									}}
								>
									<AirportRow
										airport={airport}
										advisory={advisoryMap.get(airport.iata_code)}
									/>
								</div>
							);
						})}
					</div>
				</div>
			)}
		</div>
	);
};
