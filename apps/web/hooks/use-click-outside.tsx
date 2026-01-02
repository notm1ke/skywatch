import { RefObject, useEffect } from "react";

/**
 * Checks if the element that was interacted with is blacklisted
 * (currently checks if its a part of a morphing dialog) or is rendered
 * within a portal.
 * 
 * Needed because for example if a select/dropdown is used within
 * a dialog-like UI element, it will close when the select/dropdown item
 * is clicked, since it is rendered within the portal and not part of
 * the dialog's parent DOM heirarchy.
 */
const isPortalOrWhitelisted = (element: HTMLElement) => {
	const blacklist = [
		'#morphing-dialog-backdrop',
		'#morphing-dialog-content',
		'[aria-labelledby="motion-ui-morphing-dialog-title-«rb»"]',
	]
	
	for (const selector of blacklist) {
		if (element.matches(selector)) {
			return false;
		}
	}
	
	let node: HTMLElement | null = element;
	while (node) {
		if (node.id === "root" || node.id === "__next") return false;
		if (node.tagName === "BODY" || node.tagName === "HTML") return true;
		node = node.parentElement;
	}
	
	return false;
}

export function useClickOutside<T extends HTMLElement>(
	ref: RefObject<T | null>,
	handler: (event: MouseEvent | TouchEvent) => void,
	portalCheck = false,
): void {
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent | TouchEvent) => {
			if (
				!ref ||
				!ref.current ||
				ref.current.contains(event.target as Node) ||
				(portalCheck && isPortalOrWhitelisted(event.target as HTMLElement))
			) {
				return;
			}

			handler(event);
		};

		document.addEventListener("mousedown", handleClickOutside);
		document.addEventListener("touchstart", handleClickOutside);

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
			document.removeEventListener("touchstart", handleClickOutside);
		};
	}, [ref, handler]);
}
