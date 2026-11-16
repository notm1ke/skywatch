"use client";

import { Heart } from "lucide-react";
import { MapVisualization } from "./map";
import { HeaderStats } from "./header-stats";
import { TrafficStats } from "./traffic";
import { OperationsStats } from "./operations";
import { ReferenceStats } from "./reference-stats";
import { SectionNav } from "./section-nav";

export const StatisticsTab = () => {
	return (
		// clip sideways, but don't make a scroll container: that would stop the jump bar from sticking
		<div className="min-h-screen overflow-x-clip">
			{/*
			  One layout for every width. Small screens: the map on top (as tall as its width allows, within limits) with the
			  name over its corner, and the numbers below. From `lg`: the numbers in a column on the left and the map filling
			  the rest. The map measures the box it's in and draws to fit it, so nothing here scales or shifts it.
			*/}
			<div className="mx-auto w-full max-w-(--content-max-width-ultra) lg:grid lg:min-h-[34rem] lg:grid-cols-[minmax(22rem,30rem)_minmax(0,1fr)]">
				<div className="relative h-[clamp(13rem,56vw,28rem)] lg:order-2 lg:h-auto">
					<MapVisualization padding={20} />
				</div>

				{/* the same side padding the page always had: 16px on a phone, 35px from `sm` */}
				<div className="relative flex flex-col justify-between gap-8 px-4 pb-8 max-lg:-mt-14 max-lg:border-b sm:pr-4 sm:pl-[35px] lg:order-1 lg:pt-8">
					<header className="flex flex-col items-start gap-2 font-mono text-sm xl:text-base">
						<p className="my-0 font-serif text-2xl font-normal tracking-tight whitespace-nowrap lg:text-[28px]">
							Skywatch
						</p>
						<div className="flex w-[13ch] flex-row items-center space-x-2 text-sm whitespace-nowrap text-zinc-800 uppercase dark:text-zinc-400">
							<span>With</span>
							<Heart className="size-5 fill-current text-red-600/60 hover:animate-ping dark:text-red-400/60" />
							<span>by MM</span>
						</div>
					</header>

					<HeaderStats />
				</div>
			</div>

			<div className="mx-auto w-full max-w-(--content-max-width-ultra)">
				<SectionNav />
				<TrafficStats />
				<OperationsStats />
				<ReferenceStats />
			</div>
		</div>
	);
};
