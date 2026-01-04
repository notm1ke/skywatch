"use client";

import { Heart } from "lucide-react";
import { MapVisualization } from "./map";
import { HeaderStats } from "./header-stats";

export const StatisticsTab = () => {
	return (
		<div className="min-h-screen overflow-hidden">
			<div className="w-full max-w-[2200px] mx-auto pl-[35px] overflow-hidden">
				{/* mobile */}
				<div className="flex flex-col min-[961px]:hidden">
					<div className="w-full h-[200px] flex justify-center pointer-events-none z-1 translate-x-2.5">
						<MapVisualization height={375} width={600} />
					</div>
					
					<header className="flex flex-col items-start font-mono text-sm gap-2 px-4 pt-2 z-2">
						<div>
							<p className="font-serif font-normal tracking-tight my-0 whitespace-nowrap text-2xl">
								Skywatch
							</p>
							<div className="flex flex-row space-x-2 w-[13ch] items-center text-zinc-800 dark:text-zinc-400 uppercase text-sm whitespace-nowrap">
								<span>With</span>
								<Heart className="size-5 text-red-600/60 dark:text-red-400/60 fill-current" />
								<span>by MM</span>
							</div>
						</div>
					</header>
					
					<section className="px-4 pt-6 mt-3 w-full border-t border-border">
						<HeaderStats />
					</section>
				</div>

				{/* desktop */}
				<div className="relative hidden min-[961px]:flex flex-row max-lg:items-end lg:items-center lg:justify-between">
					<header className="flex flex-col items-start font-mono text-sm xl:text-base gap-2 max-lg:mb-8 mb-auto">
						<div className="py-8">
							<p className="font-serif font-normal tracking-tight my-0 whitespace-nowrap text-[28px]">
								Skywatch
							</p>
							<div className="flex flex-row space-x-2 w-[13ch] items-center text-zinc-800 dark:text-zinc-400 uppercase text-sm whitespace-nowrap">
								<span>With</span>
								<Heart className="size-5 text-red-600/60 dark:text-red-400/60 fill-current hover:animate-ping" />
								<span>by MM</span>
							</div>
						</div>
					</header>

					<HeaderStats />

					<div className="w-full h-full pointer-events-none max-lg:scale-[1.5] max-lg:-translate-y-16 max-lg:translate-x-[10%] lg:translate-x-[21.5%] lg:translate-y-[-4.5%] 3xl:scale-[0.8] 3xl:translate-y-[-9.5%]">
						<div className="h-[515px]">
							<MapVisualization height={375} width={1000} />
						</div>
					</div>
				</div>
			</div>

			<section className="mt-8 border-t border-border">
				
			</section>
		</div>
	);
};
