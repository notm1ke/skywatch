"use client";

import { z } from "zod/v4";
import { orpc } from "~/lib/gateway";
import { Button } from "../ui/button";
import { BadgeColorVariants } from "../ui/badge";
import { PlaneRegistrationsGrid } from "./planes-grid";
import { PlaneFilter } from "@skywatch/gateway/schemas";
import { PlaneRegistrationsGridSkeleton } from "./skeleton";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { PlaneFilteringControls, usePlaneFilteringControls } from "./store";

import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle
} from "../ui/empty";

import {
	LucideIcon,
	PlaneTakeoff,
	RefreshCcw,
} from "lucide-react";

export type SelectOption = {
	label: string;
	value: string;
	icon?: LucideIcon;
	color: BadgeColorVariants;
	varColor: string;
}

const storeToInput = (store: PlaneFilteringControls): Array<z.infer<typeof PlaneFilter>> => {
	const { aircraft_type, engine_type, fractionally_owned, manufacturer, model, owner_name, registration, status } = store;
	return [
		{ type: "status", input: status },
		{ type: "manufacturer", input: manufacturer },
		{ type: "model", input: model },
		{ type: "aircraft_type", input: aircraft_type },
		{ type: "engine_type", input: engine_type },
		{ type: "owner_name", input: owner_name },
		{ type: "fractionally_owned", input: fractionally_owned },
		{ type: "n_number", input: [registration ?? ""] }
	].filter(filter => filter.input?.length) as Array<z.infer<typeof PlaneFilter>>;
};

export const PlanesTab = () => {
	const filters = usePlaneFilteringControls();
	const { data, isLoading, isFetching, error, refetch } = useQuery(orpc.planes.search.queryOptions({
		input: { filters: storeToInput(filters) },
		placeholderData: keepPreviousData
	}));

	if (!data && isLoading) return <PlaneRegistrationsGridSkeleton />;

	if (error || !data) return (
		<div className="h-[calc(100vh-8rem)] flex flex-col items-center justify-center bg-muted/5">
			<Empty>
				<EmptyHeader>
					<EmptyMedia>
						<div className="relative bg-red-200 dark:bg-red-700 px-2 py-2 rounded-lg">
							<PlaneTakeoff className="size-6 text-red-600 dark:text-red-300 -ml-0.5" />
						</div>
					</EmptyMedia>
					<EmptyTitle>Something went wrong</EmptyTitle>
					<EmptyDescription>
						We ran into an issue while retrieving plane registrations, please try again.
					</EmptyDescription>

					<EmptyContent className="mt-2">
						<Button
							size="sm"
							variant="outline"
							className="text-muted-foreground"
							onClick={() => refetch()}
						>
							<RefreshCcw />
							<span>Retry</span>
						</Button>
					</EmptyContent>
				</EmptyHeader>
			</Empty>
		</div>
	)

	return (
		<div className="flex flex-col">
			<PlaneRegistrationsGrid
				loading={isFetching}
				registrations={data.results}
				count={data.count}
			/>
		</div>
	)
}