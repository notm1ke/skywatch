import { toast } from "sonner";
import { unwrap } from "~/lib/actions";
import { useTfrInteractivity } from "./store";
import { Skeleton } from "~/components/ui/skeleton";
import { useEffect, useMemo, useState } from "react";
import { parseTfrText } from "~/lib/aviation/tfr-parser";
import { CircleX, SquareArrowOutUpRight } from "lucide-react";
import { fetchTfrText, Tfr, TfrTextResponse } from "~/lib/aviation/tfr";

export const TfrInfoPanel: React.FC<{ tfr: Tfr }> = ({ tfr }) => {
	const { close } = useTfrInteractivity();
	
	const [text, setText] = useState<TfrTextResponse | null>();
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);
	
	const refresh = () => {
		setLoading(true);
		setError(null);
		fetchTfrText(tfr.notam_id)
			.then(unwrap)
			.then(setText)
			.catch(err => toast("Error retrieving TFRs:", {
				description: err.message,
				action: {
					label: "Retry",
					onClick: refresh
				}
			}))
			.finally(() => setLoading(false));
	}
	
	useEffect(() => {
		refresh();
	}, [tfr]);
	
	const fragments = useMemo(
		() => {
			if (!text || loading) return null;
			return parseTfrText(text.text);
		},
		[text, loading]
	);
	
	return (
		<>
			<div className="px-4 py-2 border-b">
				<div className="flex flex-row justify-between">
					<span className="text-sm">TFR Details</span>
					<div className="flex flex-row space-x-2 items-center">
						<a
							href={`https://tfr.faa.gov/tfr3/?page=detail_${tfr.notam_id.replaceAll("/", "_")}`}
							target="_blank"
							rel="noopener noreferrer"
						>
							<SquareArrowOutUpRight className="size-4" />
						</a>
						
						<CircleX
							className="size-4 cursor-pointer text-red-600"
							onClick={close}
						/>
					</div>
				</div>
			</div>
			
			<div className="p-4">
				{loading && (
					<div className="flex flex-col space-y-2">
						{Array.from({ length: 15 }).map((_, i) => (
							<Skeleton
								key={`tfr-skeleton-${i}`}
								className="h-4 w-full"
								style={{ animationDelay: `${i * 150}ms` }}
							/>
						))}
					</div>
				)}
				
				{(!text && error) && (
					<div className="max-w-full h-full flex flex-col">
						<div className="flex-1 min-h-[530px] max-h-[530px] overflow-y-auto space-y-3">
							<div className="mb-1.5">
								<h3 className="text-xs text-muted-foreground">An error occurred while retrieving the TFR information:</h3>
							</div>
							<div className="bg-muted/50 p-2 leading-relaxed font-mono">
								<pre className="whitespace-pre-wrap text-[10px]">
									{error?.message ?? "Unknown error"}
								</pre>
							</div>
						</div>
					</div>
				)}
				
				{(!loading && fragments) && (
					<div className="max-w-full h-full flex flex-col">
						<div className="flex-1 min-h-[530px] max-h-[530px] overflow-y-auto space-y-3">
							<div>
								<div className="space-y-1 text-xs">
									{fragments.location && (
										<div className="flex justify-between gap-2">
											<span className="text-muted-foreground">Location</span>
											<span className="font-mono text-[10px] text-right">{fragments.location.split(' near')[0]}</span>
										</div>
									)}
									
									{fragments.artcc && (
										<div className="flex justify-between gap-2">
											<span className="text-muted-foreground">Facility</span>
											<span className="font-mono text-[10px] text-right">{fragments.artcc}</span>
										</div>
									)}
									
									{fragments.authority && (
										<div className="flex justify-between gap-2">
											<span className="text-muted-foreground">Authority</span>
											<span className="font-mono text-[10px] text-right">{fragments.authority}</span>
										</div>
									)}

									{fragments.pilots_may_contact && (
										<div className="flex justify-between gap-2">
											<span className="text-muted-foreground">Contact</span>
											<pre className="font-mono text-[10px] text-right">
												{
													fragments
														.pilots_may_contact
														.split(/,\s([0-9]{3}\-[0-9]{3}\-[0-9]{4})$/g)
														.filter(Boolean)
														.join("\n")
												}
											</pre>
										</div>
									)}
									
									<div className="my-4" />
									
									{fragments.issue_date && (
										<div className="flex justify-between gap-2">
											<span className="text-muted-foreground">Issued</span>
											<span className="font-mono text-[10px] text-right">{fragments.issue_date}</span>
										</div>
									)}
									
									{fragments.beginning_date_and_time && (
										<div className="flex justify-between gap-2">
											<span className="text-muted-foreground">Starts</span>
											<span className="font-mono text-[10px] text-right">
												{fragments.beginning_date_and_time}
											</span>
										</div>
									)}
									
									{fragments.ending_date_and_time && (
										<div className="flex justify-between gap-2">
											<span className="text-muted-foreground">Until</span>
											<span className="font-mono text-[10px] text-right">{fragments.ending_date_and_time}</span>
										</div>
									)}
									
									{fragments.replaced_notams && fragments.replaced_notams !== "N/A" && (
										<div className="flex justify-between gap-2">
											<span className="text-muted-foreground">Replaces</span>
											<span className="font-mono text-[10px] text-right">{fragments.replaced_notams}</span>
										</div>
									)}
									
									<div className="my-3" />
									
									{fragments.reason_for_notam && (
										<div className="mt-4">
											<div className="mb-1.5">
												<h3 className="text-xs text-muted-foreground">Reason</h3>
											</div>
											<div className="bg-muted/50 p-2 text-[10px] leading-relaxed font-mono">{fragments.reason_for_notam}</div>
										</div>
									)}
								</div>
							</div>


							{fragments.affected_areas?.areas && fragments.affected_areas.areas.length > 0 && (
								<div>
									<div className="mb-1.5">
										<h3 className="text-xs text-muted-foreground">Affected Airspace{fragments.affected_areas.areas.length > 1 ? 's' : ''}</h3>
									</div>
									<div className="space-y-2">
										<div className="grid grid-cols-2 gap-2">
											{fragments.affected_areas.areas.map((area, idx) => {
												const isCircular = "center" in area
												return (
													<div key={idx} className="bg-muted/50 p-2 space-y-1 border border-muted/80 border-dashed border-spacing-2">
														<div className="font-semibold text-xs text-blue-400">
															{isCircular ? area.name : `Polygon Area ${idx + 1}`}
														</div>
														{isCircular && (
															<>
																<div className="flex justify-between text-xs">
																	{/*<span className="text-muted-foreground">Center</span>*/}
																	<span className="font-mono text-[10px]">{area.center}</span>
																</div>
																{area.radius && (
																	<div className="flex justify-between text-xs">
																		<span className="text-muted-foreground">Radius</span>
																		<span className="font-mono text-[10px]">{area.radius}</span>
																	</div>
																)}
															</>
														)}
														
														{area.altitude && (
															<span className="font-mono text-[10px] line-clamp-5">
																{area.altitude.split('Altitude: ')[1]}
															</span>
														)}
													</div>
												)
											})}
										</div>
									</div>
								</div>
							)}

							{fragments.operating_restrictions && (
								<div>
									<div className="mb-1.5">
										<h3 className="text-xs text-muted-foreground">Operating Restrictions</h3>
									</div>
									<div className="bg-muted/50 p-2 leading-relaxed font-mono">
										<pre className="whitespace-pre-wrap text-[10px]">
											{fragments.operating_restrictions}
										</pre>
									</div>
								</div>
							)}

							{fragments.full_notam_text && (
								<div className="mt-4">
									<div className="mb-1.5">
										<h3 className="text-xs text-muted-foreground">NOTAM</h3>
									</div>
									<div className="bg-muted/50 p-2 font-mono leading-relaxed max-h-[300px] overflow-y-auto">
										<pre className="whitespace-pre-wrap text-[10px]">
											{fragments.full_notam_text}
										</pre>
									</div>
								</div>
							)}
						</div>
					</div>
				)}
			</div>
		</>
	)
}