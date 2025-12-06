import moment from "moment";

import { Badge } from "~/components/ui/badge";
import { AirportAdvisory } from "~/lib/faa";
import { AirportWithJoins } from "~/lib/airports";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";

import {
	capitalizeFirst,
	cn,
	getLatestTimeValue,
	getUrlDomain,
	shortenAirportName
} from "~/lib/utils";

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

import {
	CircleOff,
	ClockAlert,
	ClockCheck,
	ExternalLink,
	Info,
	Link2,
	Tally1,
	Tally2,
	Tally3,
	Timer
} from "lucide-react";

const ExtensionIndicator: React.FC<{ extensionProbability: string }> = ({ extensionProbability }) => {
	if (!extensionProbability) return null;

	const TrendIcon = extensionProbability === 'HIGH'
		? Tally3
		: extensionProbability === 'MEDIUM'
			? Tally2
			: Tally1;
	
	const color = extensionProbability === 'HIGH'
		? 'bg-red-500'
		: extensionProbability === 'MEDIUM'
			? 'bg-yellow-500'
			: 'bg-green-500';
	
	return (
		<AvatarFallback className={cn(color)}>
			{TrendIcon && <TrendIcon className="h-4 w-4 text-white" />}
		</AvatarFallback>
	);
}

const CenterBadge: React.FC<{ center: string }> = ({ center }) => (
	<Badge variant="secondary" className="font-mono text-xs mr-0.5">
		{center.toUpperCase()}
	</Badge>
)

export const GroundStopProgram: React.FC<{ airport: AirportWithJoins, advisory: AirportAdvisory }> = ({ airport, advisory }) => (
	<div className="sticky top-0 z-10 border-y border-orange-700/20 bg-orange-700/10 px-4.5 py-3 backdrop-blur-sm">
		<div className="flex items-center gap-3 justify-between">
			<span className="flex flex-row items-center gap-2 text-sm font-semibold text-orange-600">
				<CircleOff className="size-4" />
				Ground Stop
			</span>
			<div className="flex font-mono text-sm text-orange-600 items-center gap-3 h-4">
				<span>
					<span className="max-w-[35ch] truncate">{capitalizeFirst(advisory.groundStop!.impactingCondition)}{" / "}</span>
					Ends in {getLatestTimeValue(
						moment
							.utc(advisory.groundStop!.programExpirationTime)
							.diff(moment(), 'milliseconds'),
						' ', true, 2
					)}
				</span>
				<Dialog>
					<DialogTrigger className="flex flex-row space-x-1 text-sm items-center">
						<Button variant="ghost" size="icon-sm" className="cursor-pointer">
							<Info />
						</Button>
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>
								{shortenAirportName(airport.name).trim()}&apos;s ground operations suspended 
							</DialogTitle>
							<DialogDescription>
								This suspension will be in effect until{" "}
								{moment.utc(advisory.groundStop!.programExpirationTime).format('ddd, MMM Do YYYY [at] h:mm A')}.
							</DialogDescription>
						</DialogHeader>
						
						<Separator />
						
						<div className="flex flex-col space-y-1">
							<span className="text-sm">This affects flights to the following airspaces:</span>
							
							<div className="flex flex-row">
								{advisory.groundStop!.includedFacilities.map((airspace) => (
									<CenterBadge key={airspace} center={airspace} />
								))}
							</div>
						</div>
						
						<div className="grid grid-cols-2 gap-2 w-full">
							<Item variant="outline">
								<ItemHeader>
									<Avatar>
										<AvatarFallback className="bg-red-500">
											<ClockAlert className="size-4.5 text-white" />
										</AvatarFallback>
									</Avatar>
								</ItemHeader>
								<ItemContent>
									<ItemTitle>Started at</ItemTitle>
									<ItemDescription className="text-xs">
										{moment.utc(advisory.groundStop!.startTime).format('MMM Do, YYYY [at] h:mm A')}
									</ItemDescription>
								</ItemContent>
							</Item>
							
							<Item variant="outline">
								<ItemHeader>
									<Avatar>
										<AvatarFallback className="bg-green-600">
											<ClockCheck className="size-4.5 text-white" />
										</AvatarFallback>
									</Avatar>
								</ItemHeader>
								<ItemContent>
									<ItemTitle>Scheduled end</ItemTitle>
									<ItemDescription className="text-xs">
										{moment.utc(advisory.groundStop!.programExpirationTime).format('MMM Do, YYYY [at] h:mm A')}
									</ItemDescription>
								</ItemContent>
							</Item>
							
							<Item variant="outline">
								<ItemHeader>
									<Avatar>
										<ExtensionIndicator
											extensionProbability={advisory.groundStop!.probabilityOfExtension}
										/>
									</Avatar>
								</ItemHeader>
								<ItemContent>
									<ItemTitle>Extension Probability</ItemTitle>
									<ItemDescription className="text-xs">
										{capitalizeFirst(advisory.groundStop!.probabilityOfExtension.toLowerCase())}
									</ItemDescription>
								</ItemContent>
							</Item>
							
							<Item variant="outline">
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
												.utc(advisory.groundStop!.programExpirationTime)
												.diff(moment.utc(advisory.groundStop!.startTime), 'milliseconds'),
											', ', false, 3
										)}
									</ItemDescription>
								</ItemContent>
							</Item>
							
							<Item variant="outline" className="col-span-2">
								<ItemHeader>
									<Avatar>
										<AvatarImage src={`https://www.google.com/s2/favicons?domain=${advisory.groundStop!.advisoryUrl}&sz=128`} />
										<AvatarFallback className="bg-blue-500">
											<Link2 className="size-5" />
										</AvatarFallback>
									</Avatar>
								</ItemHeader>
								<ItemContent>
									<ItemTitle>Advisory URL</ItemTitle>
									<ItemDescription className="text-xs">
										<a
											href={advisory.groundStop!.advisoryUrl}
											target="_blank"
											rel="noopener noreferrer"
											className="flex flex-row space-x-4 items-center text-blue-400 hover:text-blue-300 transition-colors duration-200"
										>
											{getUrlDomain(advisory.groundStop!.advisoryUrl)}
											<ExternalLink className="size-3 ml-1" />
										</a>
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