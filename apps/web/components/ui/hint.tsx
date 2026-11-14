"use client";

import { useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";

type Props = {
	title: React.ReactNode;
	body: React.ReactNode;
	/** a line about the current state, under a divider */
	note?: React.ReactNode;
	/** shown above the control by default: the bars these go on sit at the bottom of the page */
	side?: React.ComponentProps<typeof TooltipContent>["side"];
	/** keep the tooltip closed, e.g. while the control's own popover is open */
	disabled?: boolean;
	children: React.ReactElement;
};

/** A tooltip with a title, an explanation and an optional note about the current state. */
export const Hint: React.FC<Props> = ({ title, body, note, side = "top", disabled = false, children }) => {
	const [open, setOpen] = useState(false);

	return (
		<Tooltip delayDuration={300} open={open && !disabled} onOpenChange={setOpen}>
			<TooltipTrigger asChild>{children}</TooltipTrigger>
			<TooltipContent side={side} sideOffset={6} className="grid max-w-72 gap-1 px-3 py-2 text-left">
				<div className="flex items-center gap-2 text-sm font-semibold">{title}</div>
				<div className="text-background/80">{body}</div>
				{note && <div className="mt-0.5 border-t border-background/20 pt-1.5 text-background/60">{note}</div>}
			</TooltipContent>
		</Tooltip>
	);
};
