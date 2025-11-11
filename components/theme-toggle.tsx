import { Button } from "./ui/button";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Resolved, ThemeSelection, ThemeToggler } from "./ui/theme-toggler";

export const ThemeToggle = () => {
	const { theme, resolvedTheme, setTheme } = useTheme();
	
	return (
		<ThemeToggler
			theme={theme as ThemeSelection}
			resolvedTheme={resolvedTheme as Resolved}
			setTheme={setTheme}
			direction="ttb"
		>
			{({ effective, toggleTheme }) => {
				const nextTheme =
					effective === 'dark'
						? 'light'
						: 'dark';
				
				return (
					<Button variant="ghost" onClick={() => toggleTheme(nextTheme)}>
						{effective === 'dark' && <Moon className="size-5" />}
						{effective === 'light' && <Sun className="size-5" />}
					</Button>
				);
			}}
		</ThemeToggler>
	)
}