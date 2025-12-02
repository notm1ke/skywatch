import moment from "moment-timezone";

import { Snowflake } from "lucide-react";
import { AirportAdvisory } from "~/lib/faa";
import { AirportWithJoins } from "~/lib/airports";

export const DeicingProgram: React.FC<{ airport: AirportWithJoins, advisory: AirportAdvisory }> = ({ airport, advisory }) => {
	const expiry = moment.utc(advisory.deicing!.expTime);
	
	return (
		<div className="sticky top-0 z-10 border-y border-blue-500/20 bg-blue-500/10 px-4.5 py-3 backdrop-blur-sm">
			<div className="flex items-center gap-3 justify-between">
				<span className="flex flex-row items-center gap-2 text-sm font-semibold text-blue-400">
					<Snowflake className="size-4" />
					Deicing Operations Active
				</span>
				<div className="flex font-mono text-sm text-blue-400 items-center gap-2">
					Until {expiry.format(expiry.isSame(moment.utc(), 'date') ? 'h:mm A' : 'MMM Do, h:mm A')}
				</div>
			</div>
		</div>
	)
} 