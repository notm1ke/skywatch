import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "~/lib/utils";

type BadgeColorVariants =
	| "red"
	| "orange"
	| "yellow"
	| "green"
	| "blue"
	| "indigo"
	| "purple"
	| "secondary"
	| "outline";

const badgeVariants = cva(
	"inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
	{
		variants: {
			variant: {
				default:
					"border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
				secondary:
					"border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
				destructive:
					"border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
				outline:
					"text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
				red: "border-transparent bg-red-500 text-white [a&]:hover:bg-red-600 [a&]:hover:text-white focus-visible:ring-red-500/20 dark:focus-visible:ring-red-500/40 dark:bg-red-500/60",
				orange:
					"border-transparent bg-orange-500 text-white [a&]:hover:bg-orange-600 [a&]:hover:text-white focus-visible:ring-orange-500/20 dark:focus-visible:ring-orange-500/40 dark:bg-orange-500/60",
				yellow:
					"border-transparent bg-yellow-500 text-white [a&]:hover:bg-yellow-600 [a&]:hover:text-white focus-visible:ring-yellow-500/20 dark:focus-visible:ring-yellow-500/40 dark:bg-yellow-500/60",
				green: "border-transparent bg-green-500 text-white [a&]:hover:bg-green-600 [a&]:hover:text-white focus-visible:ring-green-500/20 dark:focus-visible:ring-green-500/40 dark:bg-green-500/60",
				blue: "border-transparent bg-blue-500 text-white [a&]:hover:bg-blue-600 [a&]:hover:text-white focus-visible:ring-blue-500/20 dark:focus-visible:ring-blue-500/40 dark:bg-blue-500/60",
				indigo:
					"border-transparent bg-indigo-500 text-white [a&]:hover:bg-indigo-600 [a&]:hover:text-white focus-visible:ring-indigo-500/20 dark:focus-visible:ring-indigo-500/40 dark:bg-indigo-500/60",
				purple:
					"border-transparent bg-purple-500 text-white [a&]:hover:bg-purple-600 [a&]:hover:text-white focus-visible:ring-purple-500/20 dark:focus-visible:ring-purple-500/40 dark:bg-purple-500/60",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);

function Badge({
	className,
	variant,
	asChild = false,
	...props
}: React.ComponentProps<"span"> &
	VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
	const Comp = asChild ? Slot : "span";

	return (
		<Comp
			data-slot="badge"
			className={cn(badgeVariants({ variant }), className)}
			{...props}
		/>
	);
}

export { Badge, type BadgeColorVariants, badgeVariants };
