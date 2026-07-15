"use client";

import { orpc } from "~/lib/gateway";
import { PlaneAdsbMap } from "./map";
import { useMobile } from "~/components/mobile-provider";
import { RegistrantInfo } from "./registrant";
import { useQuery } from "@tanstack/react-query";
import { FlightHistory } from "./flight-history";
import { PlaneModel, PlanePhotosCard, PlaneDetailsCard } from "./plane-model";

type PlaneDetailsTabProps = {
	registration: string;
}

export const PlaneDetailsTab: React.FC<PlaneDetailsTabProps> = ({ registration }) => {
	const { data, isLoading, error } = useQuery(orpc.planes.findByRegistration.queryOptions({
		input: { registration }
	}));
	const { mobile, pending } = useMobile();

	if (isLoading || pending) return <>loading</>;
	if (!data || error) return <>error</>;

	if (mobile) return (
		<div className="flex flex-col divide-y">
			<PlanePhotosCard registration={data} />
			<PlaneDetailsCard registration={data} />
			<RegistrantInfo registration={data} />
			<FlightHistory registration={data} />
		</div>
	);

	return (
		<div className="flex flex-col sm:flex-row">
			<div className="basis-full sm:basis-2/3">
				<div className="flex flex-col divide-y">
					<PlaneAdsbMap plane={data} />
					<FlightHistory registration={data} />
				</div>
			</div>
			<div className="sm:basis-1/3 border-t border-l-0 sm:border-l sm:border-t-0 divide-y">
				<PlaneModel registration={data} />
				<RegistrantInfo registration={data} />
			</div>
		</div>
	)
}