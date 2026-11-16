/**
 * What each slice of a distribution is colored, in order of size: one hue per slice for the first ten, so neighbors can be
 * told apart. Past ten the slices are a long tail, and a single quiet color says that better than ten more hues.
 */
export const PALETTE = [
	"#38bdf8", "#a78bfa", "#34d399", "#fbbf24", "#fb7185",
	"#2dd4bf", "#fb923c", "#818cf8", "#a3e635", "#e879f9"
];

/** "Everyone else": gray, whatever the palette */
export const OTHERS = "#71717a";

/** the long tail: slices past the palette's ten */
export const TAIL = "#94a3b8";

/** the color of the slice at this rank (0 is the biggest) */
export const colorFor = (rank: number) => rank < PALETTE.length ? PALETTE[rank] : TAIL;

/** a watched or picked-out slice: the app's "this one" amber */
export const HIGHLIGHT = "#f59e0b";
