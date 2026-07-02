"use client";

import { orpc } from "~/lib/gateway";
import { PlaneAdsbMap } from "./map";
import { PlaneModel } from "./plane-model";
import { RegistrantInfo } from "./registrant";
import { useQuery } from "@tanstack/react-query";
import { FlightHistory } from "./flight-history";

type PlaneDetailsTabProps = {
	registration: string;
}

export const PlaneDetailsTab: React.FC<PlaneDetailsTabProps> = ({ registration }) => {
	const { data, isLoading, error, refetch } = useQuery(orpc.planes.findByRegistration.queryOptions({
		input: { registration }
	}));
	
	if (isLoading) return <>loading</>;
	if (!data || error) return <>error</>;
	
	return (
		<div className="flex flex-row">
			<div className="basis-full sm:basis-2/3">
				<div className="flex flex-col divide-y">
					<PlaneAdsbMap plane={data} />
					<FlightHistory registration={data} />
				</div>
			</div>
			<div className="sm:basis-1/3 border-t border-l-0 sm:border-l sm:border-t-0 divide-y [&>div]:p-3">
				<PlaneModel registration={data} />
				<RegistrantInfo registration={data} />
			</div>
		</div>
	)
}