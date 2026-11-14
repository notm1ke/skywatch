"use client";

import { AirportWithJoins } from "@skywatch/gateway/schemas";
import { FacilityCard, IdentityCard, InspectionCard, LocationCard, ServicesCard } from "./general";
import { FrequenciesCard, NavaidsCard, RunwaysCard } from "./linked";

/**
 * Static reference data for an airport: everything on its airports row plus the linked tables
 * (runways, navaids, frequencies).
 *
 *   lg+:  Identity | Services | Facility
 *         Inspection | Location (2 cols)
 *         Runways / Navaids / Frequencies, full width
 *
 * Below `lg` the top rows collapse (2 cols, then 1) so the cards never get cramped.
 *
 * Cards in the top rows stretch to equal height, and the row wrapper owns the bottom border: each
 * card's own `border-b` is switched off wherever it shares a row, so shorter cards don't leave a
 * ragged line mid-row.
 */
export const InspectorReferenceTab: React.FC<{ airport: AirportWithJoins }> = ({ airport }) => (
	<div className="basis-full min-w-0">
		<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 sm:border-b">
			<IdentityCard airport={airport} className="sm:border-b-0" />
			<ServicesCard airport={airport} className="sm:border-b-0 sm:border-l" />
			<FacilityCard airport={airport} className="sm:col-span-2 sm:border-t sm:border-b-0 lg:col-span-1 lg:border-t-0 lg:border-l" />
		</div>

		<div className="grid grid-cols-1 lg:grid-cols-3 lg:border-b">
			<InspectionCard airport={airport} className="lg:border-b-0" />
			<LocationCard airport={airport} className="lg:col-span-2 lg:border-b-0 lg:border-l" />
		</div>

		<RunwaysCard airport={airport} />
		<NavaidsCard airport={airport} />
		<FrequenciesCard airport={airport} />
	</div>
);
