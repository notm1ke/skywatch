"use client";

import { TfrMap } from "./tfr-map";
import { orpc } from "~/lib/gateway";
import { Button } from "../ui/button";
import { useQuery } from "@tanstack/react-query";
import { MegaphoneOff, RefreshCcw } from "lucide-react";
import { TfrTable, TfrTableSkeletonLoader } from "./tfr-table";

import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle
} from "../ui/empty";

export const TfrsTab = () => {
	const { data, isLoading, error, refetch } = useQuery(orpc.airspace.tfrs.active.queryOptions({
		queryKey: ['tfrs']
	}));

	if (isLoading) return (
		<div className="flex flex-col">
			<TfrMap />
			<TfrTableSkeletonLoader />
		</div>
	)

	if (error || !data) return (
		<div className="h-[calc(100vh-8rem)] flex flex-col items-center justify-center bg-muted/5">
			<Empty>
				<EmptyHeader>
					<EmptyMedia>
						<div className="relative bg-red-200 dark:bg-red-700 px-2 py-2 rounded-lg">
							<MegaphoneOff className="size-6 text-red-600 dark:text-red-300 -ml-0.5" />
						</div>
					</EmptyMedia>
					<EmptyTitle>Something went wrong</EmptyTitle>
					<EmptyDescription>
						We ran into an issue while retrieving TFR data, please try again.
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
			<TfrMap
				tfrs={data.tfrs}
				geo={data.geo}
			/>
			<TfrTable tfrs={data.tfrs} />
		</div>
	)
}
