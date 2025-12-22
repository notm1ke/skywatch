"use client";

import { toast } from "sonner";
import { Button } from "../ui/button";
import { unwrap } from "~/lib/actions";
import { useEffect, useState } from "react";
import { MegaphoneOff, RefreshCcw } from "lucide-react";
import { TfrMap, TfrMapSkeletonLoader } from "./tfr-map";
import { TfrTable, TfrTableSkeletonLoader } from "./tfr-table";
import { fetchTfrsAndGeo, TfrResponse } from "~/lib/aviation/tfr";

import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle
} from "../ui/empty";

export const TfrsTab = () => {
	const [data, setData] = useState<TfrResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<Error | null>();
	
	const refresh = () => {
		setLoading(true);
		setError(null);
		fetchTfrsAndGeo()
			.then(unwrap)
			.then(({ tfrs, geo }) => ({
				tfrs: unwrap(tfrs),
				geo: unwrap(geo)
			}))
			.then(setData)
			.catch(err => toast("Error retrieving TFRs:", {
				description: err.message,
				action: {
					label: "Retry",
					onClick: refresh
				}
			}))
			.finally(() => setLoading(false))
	};
	
	useEffect(() => {
		refresh();
	}, []);
	
	if (loading) return (
		<div className="flex flex-col">
			<TfrMapSkeletonLoader />
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
							onClick={refresh}
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
			<TfrMap geo={data.geo} /> 
			<TfrTable tfrs={data.tfrs} />
		</div>
	)
}