"use client";

import { toast } from "sonner";
import { TfrMap } from "./tfr-map";
import { unwrap } from "~/lib/actions";
import { TfrTable } from "./tfr-table";
import { useEffect, useState } from "react";
import { fetchTfrsAndGeo, TfrResponse } from "~/lib/aviation/tfr";

export const TfrsTab = () => {
	const [data, setData] = useState<TfrResponse | null>(null);
	const [loading, setLoading] = useState(false);
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
		<>loading</>
	)
	
	if (!data || error) return (
		<>error</>
	)
	
	return (
		<div className="flex flex-col">
			<TfrMap geo={data.geo} /> 
			<TfrTable tfrs={data.tfrs} />
		</div>
	)
}