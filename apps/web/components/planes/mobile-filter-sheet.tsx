"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { PLANE_FILTER_DEFS } from "./filter-row";
import { usePlaneFilteringControls } from "./store";
import { ScrollArea } from "~/components/ui/scroll-area";
import { RegistrationSearch } from "./filters/registration";

import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "~/components/ui/sheet";

const screenVariants = {
	enter: (direction: number) => ({ x: direction > 0 ? "100%" : "-100%" }),
	center: { x: 0 },
	exit: (direction: number) => ({ x: direction > 0 ? "-100%" : "100%" }),
};

export const MobileFilterSheet = () => {
	const store = usePlaneFilteringControls();
	const { registration, filter, reset } = store;
	const [activeFilter, setActiveFilter] = useState<string | null>(null);
	const [direction, setDirection] = useState(1);

	const countFor = (id: string) => ((store as Record<string, unknown>)[id] as string[] | undefined)?.length ?? 0;

	const activeCount = PLANE_FILTER_DEFS.reduce((n, { id }) => n + (countFor(id) > 0 ? 1 : 0), 0)
		+ (registration ? 1 : 0);

	const activeDef = PLANE_FILTER_DEFS.find(d => d.id === activeFilter);

	const openFilter = (id: string) => {
		setDirection(1);
		setActiveFilter(id);
	};

	const goBack = () => {
		setDirection(-1);
		setActiveFilter(null);
	};

	return (
		<div className="sm:hidden pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center pb-[env(safe-area-inset-bottom)]">
			<Sheet onOpenChange={(open) => !open && setActiveFilter(null)}>
				<SheetTrigger asChild>
					<Button
						variant="outline"
						className="pointer-events-auto h-11 gap-1.5 rounded-full border bg-background/90 px-4 shadow-lg backdrop-blur-sm"
					>
						<SlidersHorizontal className="size-4" />
						Filters
						{activeCount > 0 && <Badge className="px-1.5">{activeCount}</Badge>}
					</Button>
				</SheetTrigger>
				<SheetContent side="bottom" className="h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
					<div className="relative flex flex-1 min-h-0 overflow-hidden">
						<AnimatePresence initial={false} custom={direction}>
							{activeDef ? (
								<motion.div
									key={activeDef.id}
									custom={direction}
									variants={screenVariants}
									initial="enter"
									animate="center"
									exit="exit"
									transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
									className="absolute inset-0 flex flex-col bg-background"
								>
									<SheetHeader className="flex-row items-center gap-2 border-b py-3 shrink-0">
										<button
											onClick={goBack}
											className="flex items-center justify-center rounded-md p-1 -ml-1 hover:bg-accent transition-colors"
										>
											<ChevronLeft className="size-4" />
										</button>
										<SheetTitle>{activeDef.label}</SheetTitle>
									</SheetHeader>
									<activeDef.Component mode="list" />
								</motion.div>
							) : (
								<motion.div
									key="list"
									custom={direction}
									variants={screenVariants}
									initial="enter"
									animate="center"
									exit="exit"
									transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
									className="absolute inset-0 flex flex-col bg-background"
								>
									<SheetHeader className="flex-row items-center justify-between border-b py-3 shrink-0">
										<SheetTitle>Filters</SheetTitle>
										{activeCount > 0 && (
											<Button variant="ghost" size="sm" className="mr-6 h-auto py-1 text-xs" onClick={reset}>
												Clear all
											</Button>
										)}
									</SheetHeader>
									<div className="h-[41px] shrink-0">
										<RegistrationSearch
											value={registration || ""}
											onChange={(registration) => filter({ registration })}
											className="w-full h-full border-b"
											inputClassName="bg-transparent outline-none text-xs placeholder:text-muted-foreground"
										/>
									</div>
									<ScrollArea className="flex-1">
										<div className="flex flex-col">
											{PLANE_FILTER_DEFS.map(({ id, label }) => {
												const count = countFor(id);
												return (
													<button
														key={id}
														onClick={() => openFilter(id)}
														className="flex items-center justify-between px-4 py-3 border-b text-sm hover:bg-accent/50 transition-colors"
													>
														<span>{label}</span>
														<span className="flex items-center gap-1.5 text-muted-foreground">
															{count > 0 && <Badge className="px-1.5">{count}</Badge>}
															<ChevronRight className="size-4" />
														</span>
													</button>
												);
											})}
										</div>
									</ScrollArea>
								</motion.div>
							)}
						</AnimatePresence>
					</div>
				</SheetContent>
			</Sheet>
		</div>
	);
};
