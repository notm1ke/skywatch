import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const capitalizeFirst = (input: string) =>
	input
		.split(' ')
		.map(word => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');

export const safeParseJson = <T>(str?: string): T | null => {
	if (!str) return null;

	try {
		return JSON.parse(str) as T;
	} catch {
		return null;
	}
}

export const getUrlDomain = (url: string, fallback  = '') => {
	try {
		const parsedUrl = new URL(url);
		return parsedUrl.hostname.replaceAll('www.', '');
	} catch {
		return fallback;
	}
}

export const padWithZero = (number: number) => number.toString().padStart(2, '0');

export const shortenAirportName = (name: string) => {
	return name
		.replaceAll("International", "Intl")
		.replaceAll("National", "Ntl")
		.replaceAll("County", "Cnty")
		.replaceAll("Metropolitan", "Metro")
		.replaceAll("Airport", "");
};

export const getLatestTimeValue = (time: number, delimiter = ', ', short = true, top?: number) => {
	const sec = Math.trunc(time / 1000) % 60;
	const min = Math.trunc(time / 60000 % 60);
	const hrs = Math.trunc(time / 3600000 % 24);
	const days = Math.trunc(time / 86400000 % 30.4368);
	const mon = Math.trunc(time / 2.6297424E9 % 12.0);
	const yrs = Math.trunc(time / 3.15569088E10);

	const y = `${yrs}${short ? 'y' : ` year${yrs === 1 ? '' : 's'}`}`;
	const mo = `${mon}${short ? 'mo' : ` month${mon === 1 ? '' : 's'}`}`;
	const d = `${days}${short ? 'd' : ` day${days === 1 ? '' : 's'}`}`;
	const h = `${hrs}${short ? 'h' : ` hour${hrs === 1 ? '' : 's'}`}`;
	const m = `${min}${short ? 'm' : ` minute${min === 1 ? '' : 's'}`}`;
	const s = `${sec}${short ? 's' : ` second${sec === 1 ? '' : 's'}`}`;

	let result = '';
	if (yrs !== 0) result += `${y}, `;
	if (mon !== 0) result += `${mo}, `;
	if (days !== 0) result += `${d}, `;
	if (hrs !== 0) result += `${h}, `;
	if (min !== 0) result += `${m}, `;

	result = result.substring(0, Math.max(0, result.length - 2));
	if ((yrs !== 0 || mon !== 0 || days !== 0 || min !== 0 || hrs !== 0) && sec !== 0) {
		result += ', ' + s;
	}

	if (yrs === 0 && mon === 0 && days === 0 && hrs === 0 && min === 0) {
		result += s;
	}

	return result
		.trim()
		.split(', ')
		.slice(0, top ?? result.split(', ').length)
		.join(delimiter);
}
