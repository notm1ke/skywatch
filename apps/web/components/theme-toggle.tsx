import { Button } from "./ui/button";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useIsMounted } from "~/hooks/use-is-mounted";
import { Resolved, ThemeSelection, ThemeToggler } from "./ui/theme-toggler";

export const ThemeToggle = () => {
	const { theme, resolvedTheme, setTheme } = useTheme();
	const mounted = useIsMounted();
	
	if (!mounted) return (
		<Button
			variant="ghost"
			className="cursor-pointer"
		>
			<Moon className="size-5.5" />
		</Button>
	);

	return (
		<ThemeToggler
			theme={theme as ThemeSelection}
			resolvedTheme={resolvedTheme as Resolved}
			setTheme={setTheme}
			direction="ttb"
		>
			{({ effective, toggleTheme }) => (
				<Button
					variant="ghost"
					className="cursor-pointer"
					onClick={() => toggleTheme(
						effective === "dark"
							? "light"
							: "dark"
					)}
				>
					<Moon className="size-5.5 hidden dark:block" />
					<Sun className="size-5.5 dark:hidden" />
				</Button>
			)}
		</ThemeToggler>
	)
}
