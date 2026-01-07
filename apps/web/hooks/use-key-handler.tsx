import { useEffect, useRef } from "react";

type KeyCombination = {
	key: string;
	alt?: boolean;
	ctrl?: boolean;
	shift?: boolean;
	meta?: boolean;
};

type KeyHandler = (event: KeyboardEvent) => void;

const parseKeystrokeString = (keystroke: string): KeyCombination => {
	const parts = keystroke.toLowerCase().split("+");
	const combo: KeyCombination = { key: parts[parts.length - 1] };

	parts.slice(0, -1).forEach((mod) => {
		if (mod === "ctrl") combo.ctrl = true;
		if (mod === "alt") combo.alt = true;
		if (mod === "shift") combo.shift = true;
		if (mod === "meta") combo.meta = true;
	});

	return combo;
};

const matchesKeyCombination = (
	event: KeyboardEvent,
	combo: KeyCombination,
): boolean => {
	return (
		event.code.toLowerCase() === combo.key.toLowerCase() &&
		!!event.altKey === !!combo.alt &&
		!!event.ctrlKey === !!combo.ctrl &&
		!!event.shiftKey === !!combo.shift &&
		!!event.metaKey === !!combo.meta
	);
};

export const useKeyHandler = (
	keyHandlers: Record<string, KeyHandler>,
	preventDefault = true,
) => {
	const normalizedHandlers = useRef<
		Map<string, { combo: KeyCombination; handler: KeyHandler }>
	>(new Map());

	useEffect(() => {
		normalizedHandlers.current.clear();

		// Handle object format with string keys (e.g., "ctrl+shift+a": handler)
		Object.entries(keyHandlers).forEach(([keystroke, handler]) => {
			const normalizedKey = keystroke.toLowerCase();
			const combo = parseKeystrokeString(normalizedKey);

			normalizedHandlers.current.set(normalizedKey, {
				combo,
				handler,
			});
		});
	}, [keyHandlers]);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			for (const { combo, handler } of normalizedHandlers.current.values()) {
				if (matchesKeyCombination(event, combo)) {
					if (preventDefault) {
						event.preventDefault();
					}

					handler(event);
					return;
				}
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [preventDefault]);
};
