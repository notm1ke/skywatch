"use client";

import { cn } from "cnfast";
import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";
import { GUTTER } from "./shared";

const SECTIONS = [
	{ id: "traffic", label: "Traffic" },
	{ id: "operations", label: "Operations" },
	{ id: "reference", label: "Reference" }
];

/**
 * A bar that stays at the top while you scroll the sections, so a long page (it's about fourteen screens on a phone) can be
 * jumped around in. The section in view is the lit one.
 */
export const SectionNav: React.FC = () => {
	const [active, setActive] = useState(SECTIONS[0].id);
	const reduceMotion = useReducedMotion();

	useEffect(() => {
		// the section across the middle of the screen is the one being read
		const observer = new IntersectionObserver(
			entries => entries.forEach(entry => { if (entry.isIntersecting) setActive(entry.target.id); }),
			{ rootMargin: "-45% 0px -50% 0px" }
		);

		for (const section of SECTIONS) {
			const element = document.getElementById(section.id);
			if (element) observer.observe(element);
		}

		return () => observer.disconnect();
	}, []);

	return (
		<nav aria-label="Sections" className="sticky top-0 z-30 border-t border-b bg-background/85 backdrop-blur">
			<div className={cn(GUTTER, "flex h-10 items-center gap-1")}>
				{SECTIONS.map(section => (
					<a
						key={section.id}
						href={`#${section.id}`}
						aria-current={active === section.id ? "true" : undefined}
						onClick={event => {
							event.preventDefault();
							document.getElementById(section.id)?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
							window.history.replaceState(window.history.state, "", `#${section.id}`);
						}}
						className={cn(
							"rounded-sm px-2.5 py-1 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none",
							active === section.id ? "bg-accent/70 text-foreground" : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
						)}
					>
						{section.label}
					</a>
				))}
			</div>
		</nav>
	);
};
