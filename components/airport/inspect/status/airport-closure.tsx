import moment from "moment-timezone";

import { AirportAdvisory } from "~/lib/faa";
import { Button } from "~/components/ui/button";
import { AirportWithJoins } from "~/lib/airports";
import { Separator } from "~/components/ui/separator";
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

export const ClosureProgram: React.FC<{ airport: AirportWithJoins, advisory: AirportAdvisory }> = ({ airport, advisory }) => (
	<div className="sticky top-0 z-10 border-y border-red-500/20 bg-red-500/10 px-4.5 py-3 backdrop-blur-sm">
		<div className="flex items-center gap-3 justify-between">
			<span className="flex flex-row items-center gap-2 text-sm font-semibold text-red-400">
				<OctagonMinus className="size-4 animate-pulse" />
				Airport Closed
			</span>
			<div className="flex font-mono text-sm text-red-400 items-center gap-2 h-4">
				<span>
					Ends in {getLatestTimeValue(
						moment
							.utc(advisory.airportClosure!.endTime)
							.diff(moment(), 'milliseconds'),
						' ', true, 2
					)}
				</span>
				
				<Dialog>
					<DialogTrigger className="flex flex-row space-x-1 text-sm items-center">
						<Button variant="ghost" size="icon-sm">
							<Info />
						</Button>
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>
								{shortenAirportName(airport.name)} is closed
							</DialogTitle>
							<DialogDescription>
								This closure will be in effect until{" "}
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
										<AvatarFallback className="bg-red-500">
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
										<AvatarFallback className="bg-green-600">
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