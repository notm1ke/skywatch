import { cn } from "cnfast";

/** A segment of a bar along the bottom of a page: a toggle that's tinted while it's on. */
export const BarToggle: React.FC<React.ComponentProps<"button"> & { pressed: boolean }> = ({ pressed, className, ...props }) => (
	<button
		type="button"
		aria-pressed={pressed}
		className={cn(
			"flex h-full shrink-0 cursor-pointer items-center gap-1.5 px-3 text-sm transition-colors hover:bg-accent/40",
			pressed ? "bg-accent/60 text-foreground" : "text-muted-foreground",
			className
		)}
		{...props}
	/>
);
