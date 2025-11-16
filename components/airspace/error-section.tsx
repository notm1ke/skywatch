import { cn } from "~/lib/utils";
import { ReactNode } from "react";
import { Button } from "../ui/button";
import { AlertTriangle, LucideIcon } from "lucide-react";

import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle
} from "../ui/empty";

type ErrorSectionProps = {
	title: string | ReactNode;
	icon?: LucideIcon;
	iconPulse?: boolean;
	iconClasses?: string;
	className?: string;
	error?: string | null;
	fallback?: string;
	refresh?: () => void;
}

export const ErrorSection: React.FC<ErrorSectionProps> = ({
	title, error, refresh,
	icon: Icon = AlertTriangle,
	iconPulse = true,
	iconClasses = "",
	className = "",
	fallback = "An unknown error occurred",
}) => (
	<Empty className={cn(className)}>
		<EmptyHeader>
			<EmptyMedia>
				<Icon className={cn("text-yellow-300 dark:text-yellow-600 size-8", iconClasses, iconPulse ? "animate-pulse" : "")} />
			</EmptyMedia>
			<EmptyTitle>{title}</EmptyTitle>
			<EmptyDescription>{error ?? fallback}</EmptyDescription>
		</EmptyHeader>
		{refresh && (
			<EmptyContent>
				<Button onClick={refresh}>Retry</Button>
			</EmptyContent>
		)}
	</Empty>
)
