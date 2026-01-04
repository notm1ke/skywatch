import { Button } from "./ui/button";
import { Moon, Sun } from "lucide-react";
import { useIsMounted } from "~/hooks/use-is-mounted";
import { useThemeToggle } from "~/hooks/use-theme-toggle";

export const ThemeToggle = () => {
	const mounted = useIsMounted();
	const { toggleTheme } = useThemeToggle();
	
	if (!mounted) return (
		<Button
			variant="ghost"
			className="cursor-pointer"
		>
			<Moon className="size-5.5" />
		</Button>
	);

	// <Moon className="size-5.5 hidden dark:block" />
	// <Sun className="size-5.5 dark:hidden" />
 
	return (
		<Button
			variant="ghost"
			className="cursor-pointer"
			onClick={toggleTheme}
		>
			<Moon className="size-5.5 hidden dark:block" />
			<Sun className="size-5.5 dark:hidden" />
		</Button>
	)
}
