import { cn } from "cnfast";
import { ArrowLeftRight, ArrowRight } from "lucide-react";

type Props = {
	from: React.ReactNode;
	to: React.ReactNode;
	/** the two-way arrow, for searches that include both directions */
	both?: boolean;
	className?: string;
};

/** "ORD → ABE" with a real arrow icon. The icon scales with the surrounding text size. */
export const Leg: React.FC<Props> = ({ from, to, both = false, className }) => {
	const Arrow = both ? ArrowLeftRight : ArrowRight;

	return (
		<span className={cn("inline-flex items-center gap-1", className)}>
			{from}
			<Arrow className="size-[1.1em] shrink-0 text-muted-foreground" />
			{to}
		</span>
	);
};
