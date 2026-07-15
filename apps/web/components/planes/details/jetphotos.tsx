"use client";

import { cn } from "cnfast";
import { orpc } from "~/lib/gateway";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { PlaneRegistration } from "@/schemas";
import { Button } from "~/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import { SkeletonWithDelay } from "~/components/ui/skeleton";
import { CameraOff, ChevronLeft, ChevronRight, ExternalLink, X } from "lucide-react";

const SPRING = { type: "spring" as const, bounce: 0.1, duration: 0.4 };
// Fixed size for the lightbox image stage — prevents Y layout shift when
// AnimatePresence mode="sync" has two motion.divs in the DOM simultaneously.
const STAGE_W = "min(90vw, 700px)";
const STAGE_H = "min(70vh, 500px)";

function LightboxImage({ src, thumbnail, alt }: { src: string; thumbnail: string; alt: string }) {
	const [loaded, setLoaded] = useState(false);

	return (
		<>
			<img
				src={thumbnail}
				alt=""
				aria-hidden
				className={cn(
					"absolute inset-0 w-full h-full object-contain blur-xl scale-110 transition-opacity duration-500",
					loaded ? "opacity-0" : "opacity-50"
				)}
			/>
			<img
				src={src}
				alt={alt}
				className={cn(
					"absolute inset-0 w-full h-full object-contain transition-opacity duration-500",
					loaded ? "opacity-100" : "opacity-0"
				)}
				onLoad={() => setLoaded(true)}
			/>
		</>
	);
}

export const JetPhotosRenderer: React.FC<{ registration: PlaneRegistration }> = ({ registration }) => {
	const { data, isLoading, error, refetch } = useQuery(orpc.planes.jetphotos.queryOptions({
		input: { registration: registration.n_number }
	}));

	const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
	const [direction, setDirection] = useState(0);
	const [mounted, setMounted] = useState(false);

	const images = data?.Images ?? [];

	useEffect(() => {
		setMounted(true);
		return () => setMounted(false);
	}, []);

	// Preload adjacent images so navigation feels instant
	useEffect(() => {
		if (lightboxIndex === null || images.length === 0) return;
		const preload = (idx: number) => {
			const img = new window.Image();
			img.src = images[idx].Image;
		};
		preload((lightboxIndex + 1) % images.length);
		preload((lightboxIndex - 1 + images.length) % images.length);
	}, [lightboxIndex, images]);

	useEffect(() => {
		if (lightboxIndex === null) return;
		const handler = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				setLightboxIndex(null);
			} else if (e.key === "ArrowLeft") {
				setDirection(-1);
				setLightboxIndex(prev => prev !== null ? (prev - 1 + images.length) % images.length : null);
			} else if (e.key === "ArrowRight") {
				setDirection(1);
				setLightboxIndex(prev => prev !== null ? (prev + 1) % images.length : null);
			}
		};
		
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [lightboxIndex, images.length]);

	const activePhoto = lightboxIndex !== null
		? images[lightboxIndex]
		: null;

	return (
		<>
			<div
				className={cn("flex flex-row gap-1.5 sm:gap-0.5 p-2 h-[200px] sm:h-[260px] [&::-webkit-scrollbar]:hidden overflow-x-scroll")}
				style={{ scrollbarWidth: "none" }}
			>
				{isLoading && (
					<div className="w-full flex flex-row gap-0.5">
						<SkeletonWithDelay delay={0} className="w-2/3" />
						<SkeletonWithDelay delay={75} className="w-1/3" />
					</div>
				)}

				{!isLoading && error && (
					<div className="flex flex-col items-center justify-center gap-2 w-full">
						<p className="text-sm text-muted-foreground">Failed to load photos</p>
						<Button variant="secondary" size="sm" onClick={() => refetch()}>Retry</Button>
					</div>
				)}

				{!isLoading && !error && images.length === 0 && (
					<div className="flex flex-col gap-2 items-center justify-center w-full border border-border/80 rounded-md">
						<CameraOff className="size-6 text-muted-foreground" />
						<p className="text-sm text-muted-foreground">No photos available</p>
					</div>
				)}

				{!isLoading && !error && images.map((img, i) => (
					<motion.button
						key={i}
						className="shrink-0 h-full overflow-hidden cursor-pointer focus:outline-none"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ delay: i * 0.03 }}
						onClick={() => {
							setDirection(0);
							setLightboxIndex(i);
						}}
					>
						<img
							src={img.Thumbnail}
							alt={img.Aircraft}
							className="h-full w-auto object-cover rounded-md"
							loading="lazy"
						/>
					</motion.button>
				))}
			</div>

			{mounted && createPortal(
				<AnimatePresence>
					{activePhoto && (
						<>
							<motion.div
								key="backdrop"
								className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm"
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								onClick={() => setLightboxIndex(null)}
							/>
							<motion.div
								key="lightbox-content"
								className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 pointer-events-none"
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								transition={SPRING}
							>
								<button
									className="pointer-events-auto absolute top-4 right-4 p-1.5 text-white/70 hover:text-white transition-colors"
									onClick={() => setLightboxIndex(null)}
								>
									<X size={20} />
								</button>

								{/* Fixed-size stage: both entering and exiting motion.divs are absolute
								    inside here so simultaneous presence doesn't shift the nav below. */}
								<div
									className="relative pointer-events-auto"
									style={{ width: STAGE_W, height: STAGE_H }}
								>
									<AnimatePresence mode="sync" custom={direction}>
										<motion.div
											key={lightboxIndex}
											custom={direction}
											initial={{ opacity: 0, x: direction * 50 }}
											animate={{ opacity: 1, x: 0 }}
											exit={{ opacity: 0, x: direction * -50 }}
											transition={SPRING}
											className="absolute inset-0"
										>
											<LightboxImage
												src={activePhoto.Image}
												thumbnail={activePhoto.Thumbnail}
												alt={activePhoto.Aircraft}
											/>
										</motion.div>
									</AnimatePresence>
								</div>

								<div className="pointer-events-auto flex flex-row items-center gap-4 mt-4">
									<Button
										variant="secondary"
										size="icon-sm"
										onClick={() => {
											setDirection(-1);
											setLightboxIndex(prev => prev !== null ? (prev - 1 + images.length) % images.length : null);
										}}
									>
										<ChevronLeft />
									</Button>

									<div className="flex flex-col items-center gap-0.5 min-w-[200px] text-center">
										<p className="text-white text-sm font-medium leading-tight">{activePhoto.Photographer}</p>
										{activePhoto.Location && (
											<p className="text-white/60 text-xs">{activePhoto.Location}</p>
										)}
										{activePhoto.DateTaken && (
											<p className="text-white/40 text-xs">
												{new Date(activePhoto.DateTaken).toLocaleDateString('en-US', {
													year: 'numeric', month: 'short', day: 'numeric'
												})}
											</p>
										)}
									</div>

									<Button
										variant="secondary"
										size="icon-sm"
										onClick={() => {
											setDirection(1);
											setLightboxIndex(prev => prev !== null ? (prev + 1) % images.length : null);
										}}
									>
										<ChevronRight />
									</Button>
								</div>

								{activePhoto.Link && (
									<a
										href={activePhoto.Link}
										target="_blank"
										rel="noopener noreferrer"
										className="pointer-events-auto mt-2 flex items-center gap-1 text-xs text-white/40 hover:text-white/60 transition-colors"
									>
										<ExternalLink size={11} />
										View on JetPhotos
									</a>
								)}
							</motion.div>
						</>
					)}
				</AnimatePresence>,
				document.body
			)}
		</>
	);
};
