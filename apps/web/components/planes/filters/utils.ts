export function toggleValue(current: string[], value: string, multiple: boolean): string[] {
	if (!multiple) return current.includes(value) ? [] : [value];
	return current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
}
