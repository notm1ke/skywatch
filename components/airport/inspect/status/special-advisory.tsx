import moment from "moment-timezone";

import { AirportAdvisory } from "~/lib/faa";
import { Button } from "~/components/ui/button";
import { AirportWithJoins } from "~/lib/airports";
import { Separator } from "~/components/ui/separator";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { CalendarClock, Info, Megaphone, Timer } from "lucide-react";
import { getLatestTimeValue, shortenAirportName } from "~/lib/utils";

import {
	Item,
	ItemContent,
	ItemDescription,
	ItemHeader,
	ItemTitle
} from "~/components/ui/item";

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from "~/components/ui/dialog";

export const SpecialAdvisoryProgram: React.FC<{ airport: AirportWithJoins, advisory: AirportAdvisory }> = ({ airport, advisory }) => {
	const expiry = moment.utc(advisory.freeForm!.endTime);
	
	return (
		<div className="sticky top-0 z-10 border-y border-blue-500/20 bg-blue-500/10 px-4.5 py-3 backdrop-blur-sm">
			<div className="flex items-center gap-3 justify-between">
				<span className="flex flex-row items-center gap-2 text-sm font-semibold text-blue-400">
					<Megaphone className="size-4" />
					Special Advisory
				</span>
				<div className="flex font-mono text-sm text-blue-400 items-center gap-2">
					<span>Until {expiry.format(expiry.isSame(moment.utc(), 'date') ? 'h:mm A' : 'MMM Do, h:mm A')}</span>
					
					<Dialog>
						<DialogTrigger className="flex flex-row space-x-1 text-sm items-center">
							<Button variant="ghost" size="icon-sm" className="cursor-pointer">
								<Info />
							</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>
									{shortenAirportName(airport.name)} has a special advisory
								</DialogTitle>
								<DialogDescription>
									This advisory will be in effect until{" "}
									{moment.utc(advisory.freeForm!.endTime).format('ddd, MMM Do YYYY [at] h:mm A')}.
								</DialogDescription>
							</DialogHeader>
							
							<Separator />
							
							<div className="flex flex-col space-y-1 max-w-[45ch]">
								<span className="text-sm">
									NOTAM #{advisory.freeForm!.notamNumber} is associated with this special advisory:
								</span>
								<span className="font-mono text-xs text-muted-foreground wrap-break-word">
									{advisory.freeForm!.simpleText}
								</span>
							</div>
							
							<div className="grid grid-cols-2 gap-2 w-full">
								<Item variant="outline">
									<ItemHeader>
										<Avatar>
											<AvatarFallback>
												<CalendarClock className="size-4.5" />
											</AvatarFallback>
										</Avatar>
									</ItemHeader>
									<ItemContent>
										<ItemTitle>Issued at</ItemTitle>
										<ItemDescription className="text-xs">
											{moment.utc(advisory.freeForm!.issuedDate).format('ddd, MMM Do, YYYY [at] h:mm A')}
										</ItemDescription>
									</ItemContent>
								</Item>
								<Item variant="outline">
									<ItemHeader>
										<Avatar>
											<AvatarFallback>
												<Timer className="size-4.5" />
											</AvatarFallback>
										</Avatar>
									</ItemHeader>
									<ItemContent>
										<ItemTitle>Duration</ItemTitle>
										<ItemDescription className="text-xs">
											{getLatestTimeValue(moment.utc(advisory.freeForm!.endTime).diff(moment.utc(advisory.freeForm!.issuedDate)))}
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
} 