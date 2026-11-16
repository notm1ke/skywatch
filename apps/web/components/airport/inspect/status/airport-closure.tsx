import moment from "moment-timezone";

import { cn } from "cnfast";
import { Button } from "~/components/ui/button";
import { AirportAdvisory } from "~/lib/schemas";
import { Separator } from "~/components/ui/separator";
import { AirportWithJoins, closureScope } from "@skywatch/gateway/schemas";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { getLatestTimeValue, shortenAirportName } from "~/lib/utils";

import {
	Item,
	ItemContent,
	ItemDescription,
	ItemHeader,
	ItemTitle
} from "~/components/ui/item";

import {
	ClockAlert,
	ClockCheck,
	Info,
	OctagonMinus,
	Timer
} from "lucide-react";

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from "~/components/ui/dialog";

/** a closure with a qualifier after it: a daily window, or only some traffic. It's labeled, not translated. */
const isLimited = (advisory: AirportAdvisory) => closureScope(advisory.airportClosure) === "limited";

export const ClosureProgram: React.FC<{ airport: AirportWithJoins, advisory: AirportAdvisory }> = ({ airport, advisory }) => (
	<div className="sticky top-0 border-y border-red-500/20 bg-red-500/10 px-4.5 py-3 backdrop-blur-sm">
		<div className="flex items-center gap-3 justify-between">
			<span className="flex flex-row items-center gap-2 text-sm font-semibold text-red-400">
				{/* a full closure pulses; a limited one doesn't shut the airport, so it holds still */}
				<OctagonMinus className={cn("size-4", !isLimited(advisory) && "animate-pulse")} />
				{isLimited(advisory) ? "Limited Closure" : "Airport Closed"}
			</span>
			<div className="flex font-mono text-sm text-red-400 items-center gap-2 h-4">
				{/* what the NOTAM says, as it says it */}
				{isLimited(advisory) && (
					<span className="hidden max-w-80 truncate text-xs uppercase sm:inline" title={advisory.airportClosure!.simpleText}>
						{advisory.airportClosure!.text}
					</span>
				)}

				<span>
					Ends in {getLatestTimeValue(
						moment
							.utc(advisory.airportClosure!.endTime)
							.diff(moment(), 'milliseconds'),
						' ', true, 2
					)}
				</span>
				
				<Dialog>
					<DialogTrigger asChild className="flex flex-row space-x-1 text-sm items-center">
						<Button
							variant="ghost"
							size="sm"
							className="h-6 w-6 p-0 cursor-pointer"
						>
							<Info className="h-3.5 w-3.5" />
						</Button>
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>
								{isLimited(advisory)
									? <>{shortenAirportName(airport.name)} has a limited closure</>
									: <>{shortenAirportName(airport.name)} is closed</>}
							</DialogTitle>
							<DialogDescription>
								{isLimited(advisory)
									? "This closure doesn't shut the airport outright: it's a window of time or applies to some traffic only. The NOTAM below says which. It stays on the books until "
									: "This closure will be in effect until "}
								{moment.utc(advisory.airportClosure!.endTime).format('ddd, MMM Do YYYY [at] h:mm A')}.
							</DialogDescription>
						</DialogHeader>
						
						<Separator />
						
						<div className="flex flex-col space-y-1">
							<span className="text-sm">
								NOTAM #{advisory.airportClosure!.notamNumber} is associated with this closure program:
							</span>
							<span className="font-mono text-xs text-muted-foreground wrap-break-word">
								{advisory.airportClosure!.simpleText}
							</span>
						</div>
						
						<div className="grid grid-cols-2 gap-2 w-full">
							<Item variant="outline">
								<ItemHeader>
									<Avatar>
										<AvatarFallback className="bg-red-300 dark:bg-red-500">
											<ClockAlert className="size-4.5" />
										</AvatarFallback>
									</Avatar>
								</ItemHeader>
								<ItemContent>
									<ItemTitle>Started at</ItemTitle>
									<ItemDescription className="text-xs">
										{moment.utc(advisory.airportClosure!.startTime).format('MMM Do, YYYY [at] h:mm A')}
									</ItemDescription>
								</ItemContent>
							</Item>
							
							<Item variant="outline">
								<ItemHeader>
									<Avatar>
										<AvatarFallback className="bg-green-300 dark:bg-green-500">
											<ClockCheck className="size-4.5" />
										</AvatarFallback>
									</Avatar>
								</ItemHeader>
								<ItemContent>
									<ItemTitle>Scheduled end</ItemTitle>
									<ItemDescription className="text-xs">
										{moment.utc(advisory.airportClosure!.endTime).format('MMM Do, YYYY [at] h:mm A')}
									</ItemDescription>
								</ItemContent>
							</Item>
							
							<Item variant="outline" className="col-span-2">
								<ItemHeader>
									<Avatar>
										<AvatarFallback>
											<Timer className="size-5" />
										</AvatarFallback>
									</Avatar>
								</ItemHeader>
								<ItemContent>
									<ItemTitle>Scheduled Interruption</ItemTitle>
									<ItemDescription className="text-xs">
										{getLatestTimeValue(
											moment
												.utc(advisory.airportClosure!.endTime)
												.diff(moment.utc(advisory.airportClosure!.startTime), 'milliseconds'),
											', ', false, 3
										)}
									</ItemDescription>
								</ItemContent>
							</Item>
						</div>
						
						<span className="text-xs text-muted-foreground">
							All listed times are in UTC
						</span>
					</DialogContent>
				</Dialog>
			</div>
		</div>
	</div>
)