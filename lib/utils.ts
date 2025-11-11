import { twMerge } from "tailwind-merge";
import { clsx, type ClassValue } from "clsx";
import { FlowStatusMetricKeys } from "./faa";

export type ArgumentType<Func> = Func extends (...args: infer Args) => any ? Args : never;

export type RemoteChartType = 
	| "line"
	| "bar"
	| "bar_stacked"
	| "pie"

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const shortNumberFormatter = new Intl.NumberFormat('en', {
  notation: "compact",
  compactDisplay: "short",
  maximumFractionDigits: 1
});

export const formatFaaTime = (raw: string) => {
	if (!raw) return 'Today';
	const hour = (parseInt(raw.slice(0, 2)) % 12)
	return (hour === 0 ? '12' : padWithZero(hour)) + ':' + raw.slice(2) + ' ' + (raw < '1200' ? 'am' : 'pm');
}

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
		.replaceAll("Airport", "")
		.replaceAll(/\/.*$/g, "");
};

export const delayReason = (raw: string) => {
	if (/:wx$/g.test(raw.toLowerCase()))
		return "Weather";
	if (/:(vol|volume|minutes in trail)$/g.test(raw.toLowerCase()) || raw.toLowerCase().includes('demand'))
		return "Traffic Volume";
	if (raw.toLowerCase().includes('staffing') || raw.toLowerCase().includes('staff'))
		return "Staffing";
	return raw;
}

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

export const flowStatusColors = (status: FlowStatusMetricKeys) => {
	switch (status) {
		case "arrived": return "var(--color-green-400)";
		case "departing": return "var(--color-blue-400)";
		case "flight_active": return "var(--color-blue-600)";
		case "past_dept_time": return "var(--color-yellow-400)";
		case "edct_issued": return "var(--color-yellow-600)";
		case "irregular": return "var(--color-red-400)";
	}
}

export const flowCenterColors = (center: string) => {
	switch (center) {
		case "ZAB": return "var(--color-red-400)";
		case "ZAU": return "var(--color-orange-400)";
		case "ZBW": return "var(--color-amber-400)";
		case "ZDC": return "var(--color-yellow-400)";
		case "ZDV": return "var(--color-lime-400)";
		case "ZFW": return "var(--color-green-400)";
		case "ZHU": return "var(--color-emerald-400)";
		case "ZID": return "var(--color-teal-400)";
		case "ZJX": return "var(--color-cyan-400)";
		case "ZKC": return "var(--color-sky-400)";
		case "ZLA": return "var(--color-blue-400)";
		case "ZLC": return "var(--color-indigo-400)";
		case "ZMA": return "var(--color-violet-400)";
		case "ZME": return "var(--color-purple-400)";
		case "ZMP": return "var(--color-fuchsia-400)";
		case "ZNY": return "var(--color-pink-400)";
		case "ZOA": return "var(--color-rose-400)";
		case "ZOB": return "var(--color-slate-600)";
		case "ZSE": return "var(--color-gray-600)";
		case "ZTL": return "var(--color-zinc-600)";
		default: return "var(--color-blue-400)";
	}
}