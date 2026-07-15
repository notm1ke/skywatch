"use client";

import { SlidersHorizontal } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { AirportAdvisory } from "~/lib/schemas";
import { useAirportFilters } from "./store";
import { AirportWithJoins } from "@skywatch/gateway/schemas";
import { FilterSidebarContent } from "./filter-sidebar";

import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "~/components/ui/sheet";

export const MobileFilterSheet = ({
	airports,
	advisoryMap,
}: {
	airports: AirportWithJoins[];
	advisoryMap: Map<string, AirportAdvisory>;
}) => {
	const { status, type, hubAirline, artcc, state, capabilities, runwayRange, elevationRange, timezone, atcType, reset } = useAirportFilters();

	const activeCount = [status, type, hubAirline, artcc, state, capabilities, timezone, atcType]
		.filter((arr) => arr.length > 0).length
		+ (runwayRange ? 1 : 0)
		+ (elevationRange ? 1 : 0);

	return (
		<div className="sm:hidden pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center pb-[env(safe-area-inset-bottom)]">
			<Sheet>
				<SheetTrigger asChild>
					<Button
						variant="outline"
						className="pointer-events-auto h-11 gap-1.5 rounded-full border bg-background/90 px-4 shadow-lg backdrop-blur-sm"
					>
						<SlidersHorizontal className="size-4" />
						Filters
						{activeCount > 0 && <Badge className="px-1.5">{activeCount}</Badge>}
					</Button>
				</SheetTrigger>
				<SheetContent side="bottom" className="h-[85vh] flex flex-col gap-0 p-0">
					<SheetHeader className="flex-row items-center justify-between border-b py-3">
						<SheetTitle>Filters</SheetTitle>
						{activeCount > 0 && (
							<Button variant="ghost" size="sm" className="mr-6 h-auto py-1 text-xs" onClick={reset}>
								Clear all
							</Button>
						)}
					</SheetHeader>
					<FilterSidebarContent airports={airports} advisoryMap={advisoryMap} />
				</SheetContent>
			</Sheet>
		</div>
	);
};
